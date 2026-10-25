// Windows microphone capture with WASAPI loopback and WebRTC AEC3.
// stdout is 16 kHz mono Float32. stderr is one JSON event per line.
// stdin EOF stops the streams and exits 0.
//
// Build with the MSYS2 UCRT64 package webrtc-audio-processing-1. The include
// path comes from `pkg-config --cflags webrtc-audio-processing-1`.

#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <avrt.h>
#include <initguid.h>
#include <functiondiscoverykeys_devpkey.h>
#include <io.h>
#include <fcntl.h>
#include <stdio.h>

#include <atomic>
#include <cstdint>
#include <cstring>
#include <deque>
#include <string>
#include <thread>
#include <utility>
#include <vector>

#include "modules/audio_processing/include/audio_processing.h"

namespace {

constexpr int kCaptureRate = 48000;
constexpr int kOutputRate = 16000;
constexpr int kFrame = kCaptureRate / 100;
constexpr int kOutputFrame = kOutputRate / 100;
constexpr uint32_t kStreamFlags =
    AUDCLNT_STREAMFLAGS_EVENTCALLBACK | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM | AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY;

enum class Failure { Denied, Missing, Unavailable, Failed };

template <typename T>
struct ComPtr {
  T* pointer = nullptr;
  ComPtr() = default;
  ComPtr(const ComPtr&) = delete;
  ComPtr& operator=(const ComPtr&) = delete;
  ComPtr(ComPtr&& other) noexcept : pointer(other.pointer) { other.pointer = nullptr; }
  ComPtr& operator=(ComPtr&& other) noexcept {
    if (this != &other) {
      reset();
      pointer = other.pointer;
      other.pointer = nullptr;
    }
    return *this;
  }
  ~ComPtr() { reset(); }
  void reset() {
    if (pointer) pointer->Release();
    pointer = nullptr;
  }
  T** put() {
    reset();
    return &pointer;
  }
  T* operator->() const { return pointer; }
  explicit operator bool() const { return pointer != nullptr; }
};

struct Frame {
  int64_t qpc = 0;
  float samples[kFrame]{};
};

std::string jsonString(const std::string& text) {
  std::string out = "\"";
  for (unsigned char ch : text) {
    switch (ch) {
    case '\\': out += "\\\\"; break;
    case '"': out += "\\\""; break;
    case '\n': out += "\\n"; break;
    case '\r': out += "\\r"; break;
    case '\t': out += "\\t"; break;
    default:
      if (ch < 0x20) {
        char hex[8];
        snprintf(hex, sizeof hex, "\\u%04x", ch);
        out += hex;
      } else {
        out += static_cast<char>(ch);
      }
    }
  }
  out += '"';
  return out;
}

void emitError(const char* code, const std::string& message) {
  fprintf(stderr, "{\"event\":\"error\",\"code\":%s,\"message\":%s}\n", jsonString(code).c_str(), jsonString(message).c_str());
  fflush(stderr);
}

void emitReady(const std::string& input, const std::string& output) {
  fprintf(stderr, "{\"event\":\"ready\",\"aec\":true,\"input\":%s,\"output\":%s}\n", jsonString(input).c_str(), jsonString(output).c_str());
  fflush(stderr);
}

[[noreturn]] void fail(Failure kind, const std::string& message) {
  const char* code = "failed";
  int status = 1;
  switch (kind) {
  case Failure::Denied: code = "mic-denied"; status = 3; break;
  case Failure::Missing: code = "no-device"; status = 5; break;
  case Failure::Unavailable: code = "unavailable"; status = 4; break;
  case Failure::Failed: break;
  }
  emitError(code, message);
  exit(status);
}

Failure classify(HRESULT hr) {
  if (hr == E_ACCESSDENIED) return Failure::Denied;
  if (hr == E_NOTFOUND || hr == HRESULT_FROM_WIN32(ERROR_NOT_FOUND)) return Failure::Missing;
  return Failure::Failed;
}

std::string utf8(const wchar_t* wide) {
  if (!wide || !*wide) return "unknown";
  const int bytes = WideCharToMultiByte(CP_UTF8, 0, wide, -1, nullptr, 0, nullptr, nullptr);
  if (bytes <= 1) return "unknown";
  std::string text(static_cast<size_t>(bytes - 1), '\0');
  WideCharToMultiByte(CP_UTF8, 0, wide, -1, text.data(), bytes, nullptr, nullptr);
  return text;
}

std::string deviceName(IMMDevice* device) {
  if (!device) return "unknown";
  ComPtr<IPropertyStore> store;
  if (FAILED(device->OpenPropertyStore(STGM_READ, store.put())) || !store) return "unknown";
  PROPVARIANT value;
  PropVariantInit(&value);
  std::string name = "unknown";
  if (SUCCEEDED(store->GetValue(PKEY_Device_FriendlyName, &value)) && value.vt == VT_LPWSTR) name = utf8(value.pwszVal);
  PropVariantClear(&value);
  return name;
}

WAVEFORMATEX captureFormat() {
  WAVEFORMATEX format{};
  format.wFormatTag = WAVE_FORMAT_IEEE_FLOAT;
  format.nChannels = 1;
  format.nSamplesPerSec = kCaptureRate;
  format.wBitsPerSample = 32;
  format.nBlockAlign = 4;
  format.nAvgBytesPerSec = kCaptureRate * 4;
  return format;
}

class DeviceNotify final : public IMMNotificationClient {
 public:
  explicit DeviceNotify(HANDLE changed) : changed_(changed) {}

  ULONG STDMETHODCALLTYPE AddRef() override { return InterlockedIncrement(&refs_); }
  ULONG STDMETHODCALLTYPE Release() override {
    const ULONG left = InterlockedDecrement(&refs_);
    if (left == 0) delete this;
    return left;
  }
  HRESULT STDMETHODCALLTYPE QueryInterface(REFIID id, void** out) override {
    if (!out) return E_POINTER;
    if (id == __uuidof(IUnknown) || id == __uuidof(IMMNotificationClient)) {
      *out = static_cast<IMMNotificationClient*>(this);
      AddRef();
      return S_OK;
    }
    *out = nullptr;
    return E_NOINTERFACE;
  }
  HRESULT STDMETHODCALLTYPE OnDeviceStateChanged(LPCWSTR, DWORD) override { return S_OK; }
  HRESULT STDMETHODCALLTYPE OnDeviceAdded(LPCWSTR) override { return S_OK; }
  HRESULT STDMETHODCALLTYPE OnDeviceRemoved(LPCWSTR) override { return S_OK; }
  HRESULT STDMETHODCALLTYPE OnDefaultDeviceChanged(EDataFlow flow, ERole role, LPCWSTR) override {
    if (role == eConsole && (flow == eCapture || flow == eRender)) SetEvent(changed_);
    return S_OK;
  }
  HRESULT STDMETHODCALLTYPE OnPropertyValueChanged(LPCWSTR, const PROPERTYKEY) override { return S_OK; }

 private:
  HANDLE changed_;
  LONG refs_ = 1;
};

struct Streams {
  ComPtr<IMMDevice> inputDevice;
  ComPtr<IMMDevice> outputDevice;
  ComPtr<IAudioClient> microphone;
  ComPtr<IAudioClient> loopback;
  ComPtr<IAudioClient> silence;
  ComPtr<IAudioCaptureClient> microphoneCapture;
  ComPtr<IAudioCaptureClient> loopbackCapture;
  ComPtr<IAudioRenderClient> silenceRender;
  HANDLE microphoneEvent = nullptr;
  HANDLE loopbackEvent = nullptr;
  HANDLE silenceEvent = nullptr;
  WORD silenceBlock = 0;
  int delayMs = 0;
  std::string inputName;
  std::string outputName;

  Streams() = default;
  Streams(const Streams&) = delete;
  Streams& operator=(const Streams&) = delete;
  Streams(Streams&& other) noexcept { *this = std::move(other); }
  Streams& operator=(Streams&& other) noexcept {
    if (this == &other) return *this;
    close();
    inputDevice = std::move(other.inputDevice);
    outputDevice = std::move(other.outputDevice);
    microphone = std::move(other.microphone);
    loopback = std::move(other.loopback);
    silence = std::move(other.silence);
    microphoneCapture = std::move(other.microphoneCapture);
    loopbackCapture = std::move(other.loopbackCapture);
    silenceRender = std::move(other.silenceRender);
    microphoneEvent = other.microphoneEvent;
    loopbackEvent = other.loopbackEvent;
    silenceEvent = other.silenceEvent;
    other.microphoneEvent = other.loopbackEvent = other.silenceEvent = nullptr;
    silenceBlock = other.silenceBlock;
    delayMs = other.delayMs;
    inputName = std::move(other.inputName);
    outputName = std::move(other.outputName);
    return *this;
  }
  ~Streams() { close(); }

  void close() {
    if (microphone) microphone->Stop();
    if (loopback) loopback->Stop();
    if (silence) silence->Stop();
    microphoneCapture.reset();
    loopbackCapture.reset();
    silenceRender.reset();
    microphone.reset();
    loopback.reset();
    silence.reset();
    inputDevice.reset();
    outputDevice.reset();
    if (microphoneEvent) CloseHandle(microphoneEvent);
    if (loopbackEvent) CloseHandle(loopbackEvent);
    if (silenceEvent) CloseHandle(silenceEvent);
    microphoneEvent = loopbackEvent = silenceEvent = nullptr;
  }
};

int latencyMs(IAudioClient* client) {
  REFERENCE_TIME latency = 0;
  REFERENCE_TIME period = 0;
  REFERENCE_TIME minimum = 0;
  if (!client) return 0;
  client->GetStreamLatency(&latency);
  client->GetDevicePeriod(&period, &minimum);
  const long long ticks = static_cast<long long>(latency) + static_cast<long long>(period);
  int ms = static_cast<int>(ticks / 10000);
  if (ms < 0) ms = 0;
  if (ms > 500) ms = 500;
  return ms;
}

void checkActivate(HRESULT hr, const char* what) {
  if (SUCCEEDED(hr)) return;
  fail(classify(hr), what);
}

HANDLE addEvent(IAudioClient* client) {
  HANDLE event = CreateEventW(nullptr, FALSE, FALSE, nullptr);
  if (!event || FAILED(client->SetEventHandle(event))) {
    if (event) CloseHandle(event);
    fail(Failure::Failed, "the audio endpoint did not accept an event");
  }
  return event;
}

void openClient(IMMDevice* device, DWORD extraFlags, ComPtr<IAudioClient>& client) {
  checkActivate(device->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, reinterpret_cast<void**>(client.put())), "the audio endpoint could not be opened");
  WAVEFORMATEX format = captureFormat();
  HRESULT hr = client->Initialize(AUDCLNT_SHAREMODE_SHARED, kStreamFlags | extraFlags, 0, 0, &format, nullptr);
  if (FAILED(hr)) {
    client.reset();
    fail(hr == E_ACCESSDENIED ? Failure::Denied : Failure::Unavailable, "the audio stream could not be initialized");
  }
}

void fillSilence(IAudioRenderClient* render, UINT32 frames, WORD block) {
  if (!render || frames == 0 || block == 0) return;
  BYTE* data = nullptr;
  if (FAILED(render->GetBuffer(frames, &data)) || !data) return;
  memset(data, 0, static_cast<size_t>(frames) * block);
  render->ReleaseBuffer(frames, 0);
}

void primeSilence(IAudioClient* client, IAudioRenderClient* render, WORD block) {
  UINT32 size = 0;
  if (FAILED(client->GetBufferSize(&size))) return;
  fillSilence(render, size, block);
}

void pumpSilence(IAudioClient* client, IAudioRenderClient* render, WORD block) {
  UINT32 size = 0;
  UINT32 padding = 0;
  if (FAILED(client->GetBufferSize(&size)) || FAILED(client->GetCurrentPadding(&padding))) return;
  if (size > padding) fillSilence(render, size - padding, block);
}

void takePackets(IAudioCaptureClient* capture, std::vector<float>& pending, int64_t& origin, bool& originValid, std::deque<Frame>& frames, int64_t step) {
  UINT32 packet = 0;
  while (SUCCEEDED(capture->GetNextPacketSize(&packet)) && packet > 0) {
    BYTE* data = nullptr;
    UINT32 count = 0;
    DWORD flags = 0;
    UINT64 position = 0;
    UINT64 qpc = 0;
    if (FAILED(capture->GetBuffer(&data, &count, &flags, &position, &qpc))) return;
    const bool silent = (flags & AUDCLNT_BUFFERFLAGS_SILENT) != 0 || data == nullptr;
    if (pending.empty()) {
      origin = static_cast<int64_t>(qpc);
      originValid = true;
    }
    const float* samples = silent ? nullptr : reinterpret_cast<const float*>(data);
    for (UINT32 index = 0; index < count; ++index) pending.push_back(samples ? samples[index] : 0.f);
    capture->ReleaseBuffer(count);
    while (pending.size() >= static_cast<size_t>(kFrame)) {
      Frame frame;
      frame.qpc = origin;
      memcpy(frame.samples, pending.data(), sizeof frame.samples);
      pending.erase(pending.begin(), pending.begin() + kFrame);
      origin += step;
      frames.push_back(frame);
    }
  }
}

rtc::scoped_refptr<webrtc::AudioProcessing> makeProcessor() {
  webrtc::AudioProcessing::Config config;
  config.echo_canceller.enabled = true;
  config.echo_canceller.mobile_mode = false;
  config.noise_suppression.enabled = true;
  config.noise_suppression.level = webrtc::AudioProcessing::Config::NoiseSuppression::kModerate;
  config.gain_controller1.enabled = false;
  config.gain_controller2.enabled = false;
  config.high_pass_filter.enabled = true;
  // webrtc-audio-processing 1.3 creates the instance first and applies the
  // runtime config afterwards. Newer libwebrtc moved the config into the
  // builder as SetConfig(); the MSYS2 package still ships the 1.3 API.
  webrtc::AudioProcessingBuilder builder;
  rtc::scoped_refptr<webrtc::AudioProcessing> processor(builder.Create());
  if (!processor) fail(Failure::Unavailable, "echo cancellation could not be created");
  processor->ApplyConfig(config);
  return processor;
}

void reverseFrame(webrtc::AudioProcessing* processor, const float* samples) {
  float copy[kFrame];
  memcpy(copy, samples, sizeof copy);
  const float* input[1] = {samples};
  float* output[1] = {copy};
  processor->ProcessReverseStream(input, webrtc::StreamConfig(kCaptureRate, 1), webrtc::StreamConfig(kCaptureRate, 1), output);
}

void alignAndProcess(webrtc::AudioProcessing* processor, const Frame& microphone, std::deque<Frame>& loop, int64_t frequency, int delayMs, int64_t& lastReverse) {
  const int64_t behind = frequency / 10;
  const int64_t ahead = frequency / 5;
  while (!loop.empty() && loop.front().qpc > microphone.qpc + ahead) loop.pop_front();
  while (!loop.empty() && loop.front().qpc <= microphone.qpc) {
    reverseFrame(processor, loop.front().samples);
    lastReverse = loop.front().qpc;
    loop.pop_front();
  }
  int padded = 0;
  while (lastReverse != 0 && microphone.qpc - lastReverse > behind && padded < 12) {
    float silence[kFrame] = {};
    reverseFrame(processor, silence);
    lastReverse += frequency / 100;
    ++padded;
  }
  float cleaned[kOutputFrame] = {};
  const float* input[1] = {microphone.samples};
  float* output[1] = {cleaned};
  processor->set_stream_delay_ms(delayMs);
  if (processor->ProcessStream(input, webrtc::StreamConfig(kCaptureRate, 1), webrtc::StreamConfig(kOutputRate, 1), output) != 0) {
    memset(cleaned, 0, sizeof cleaned);
  }
  if (fwrite(cleaned, sizeof(float), kOutputFrame, stdout) != static_cast<size_t>(kOutputFrame)) exit(0);
  fflush(stdout);
}

Streams openStreams(IMMDeviceEnumerator* enumerator) {
  Streams streams;
  HRESULT inputHr = enumerator->GetDefaultAudioEndpoint(eCapture, eConsole, streams.inputDevice.put());
  if (FAILED(inputHr)) fail(classify(inputHr), "no default microphone");
  HRESULT outputHr = enumerator->GetDefaultAudioEndpoint(eRender, eConsole, streams.outputDevice.put());
  if (FAILED(outputHr)) fail(classify(outputHr), "no default speaker");
  streams.inputName = deviceName(streams.inputDevice.pointer);
  streams.outputName = deviceName(streams.outputDevice.pointer);

  openClient(streams.inputDevice.pointer, 0, streams.microphone);
  openClient(streams.outputDevice.pointer, AUDCLNT_STREAMFLAGS_LOOPBACK, streams.loopback);
  checkActivate(streams.outputDevice->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, reinterpret_cast<void**>(streams.silence.put())), "the silence stream could not be opened");
  WAVEFORMATEX* mix = nullptr;
  if (FAILED(streams.silence->GetMixFormat(&mix)) || !mix) fail(Failure::Unavailable, "the speaker format is unavailable");
  streams.silenceBlock = mix->nBlockAlign == 0 ? 4 : mix->nBlockAlign;
  const HRESULT silenceHr = streams.silence->Initialize(AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_EVENTCALLBACK, 0, 0, mix, nullptr);
  CoTaskMemFree(mix);
  if (FAILED(silenceHr)) fail(silenceHr == E_ACCESSDENIED ? Failure::Denied : Failure::Unavailable, "the silence stream could not be initialized");

  streams.microphoneEvent = addEvent(streams.microphone.pointer);
  streams.loopbackEvent = addEvent(streams.loopback.pointer);
  streams.silenceEvent = addEvent(streams.silence.pointer);
  checkActivate(streams.microphone->GetService(__uuidof(IAudioCaptureClient), reinterpret_cast<void**>(streams.microphoneCapture.put())), "the microphone buffer is unavailable");
  checkActivate(streams.loopback->GetService(__uuidof(IAudioCaptureClient), reinterpret_cast<void**>(streams.loopbackCapture.put())), "the loopback buffer is unavailable");
  checkActivate(streams.silence->GetService(__uuidof(IAudioRenderClient), reinterpret_cast<void**>(streams.silenceRender.put())), "the silence buffer is unavailable");

  primeSilence(streams.silence.pointer, streams.silenceRender.pointer, streams.silenceBlock);
  checkActivate(streams.silence->Start(), "the silence stream did not start");
  checkActivate(streams.loopback->Start(), "the loopback stream did not start");
  checkActivate(streams.microphone->Start(), "the microphone stream did not start");
  pumpSilence(streams.silence.pointer, streams.silenceRender.pointer, streams.silenceBlock);
  streams.delayMs = latencyMs(streams.microphone.pointer) + latencyMs(streams.silence.pointer);
  return streams;
}

}  // namespace

int wmain() {
  if (_setmode(_fileno(stdout), _O_BINARY) == -1) fail(Failure::Failed, "stdout could not be switched to binary");
  HRESULT com = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  if (FAILED(com)) fail(Failure::Failed, "COM did not start");

  DWORD task = 0;
  HANDLE multimedia = AvSetMmThreadCharacteristicsW(L"Pro Audio", &task);

  ComPtr<IMMDeviceEnumerator> enumerator;
  checkActivate(CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL, __uuidof(IMMDeviceEnumerator), reinterpret_cast<void**>(enumerator.put())), "the audio device list is unavailable");

  HANDLE stop = CreateEventW(nullptr, TRUE, FALSE, nullptr);
  HANDLE changed = CreateEventW(nullptr, FALSE, FALSE, nullptr);
  if (!stop || !changed) fail(Failure::Failed, "an event could not be created");
  DeviceNotify* notify = new DeviceNotify(changed);
  enumerator->RegisterEndpointNotificationCallback(notify);
  // Do not Release here. MMDevAPI keeps calling this object on its own thread
  // pool, and on the MSYS2 1.3 build it does not hold a reference of its own:
  // the immediate Release deleted the object and the first notification then
  // jumped through freed memory (access violation on an MMDevAPI thread).
  // The helper exits right after Unregister, so one object for the process
  // lifetime is the safe trade.

  std::thread([stop] {
    HANDLE input = GetStdHandle(STD_INPUT_HANDLE);
    char buffer[256];
    DWORD read = 0;
    while (ReadFile(input, buffer, sizeof buffer, &read, nullptr) && read > 0) {}
    SetEvent(stop);
  }).detach();

  LARGE_INTEGER frequency{};
  QueryPerformanceFrequency(&frequency);
  const int64_t qpcHz = frequency.QuadPart > 0 ? frequency.QuadPart : 1;
  const int64_t frameStep = qpcHz / 100;

  auto processor = makeProcessor();
  Streams streams = openStreams(enumerator.pointer);
  emitReady(streams.inputName, streams.outputName);

  std::deque<Frame> microphoneFrames;
  std::deque<Frame> loopFrames;
  std::vector<float> microphonePending;
  std::vector<float> loopPending;
  int64_t microphoneOrigin = 0;
  int64_t loopOrigin = 0;
  bool microphoneOriginValid = false;
  bool loopOriginValid = false;
  int64_t lastReverse = 0;

  HANDLE waits[5] = {stop, changed, streams.microphoneEvent, streams.loopbackEvent, streams.silenceEvent};
  while (true) {
    const DWORD woke = WaitForMultipleObjects(5, waits, FALSE, 10);
    if (woke == WAIT_OBJECT_0) break;
    if (woke == WAIT_OBJECT_0 + 1) {
      microphoneFrames.clear();
      loopFrames.clear();
      microphonePending.clear();
      loopPending.clear();
      microphoneOriginValid = false;
      loopOriginValid = false;
      lastReverse = 0;
      streams.close();
      processor = makeProcessor();
      streams = openStreams(enumerator.pointer);
      waits[2] = streams.microphoneEvent;
      waits[3] = streams.loopbackEvent;
      waits[4] = streams.silenceEvent;
      emitReady(streams.inputName, streams.outputName);
      continue;
    }
    pumpSilence(streams.silence.pointer, streams.silenceRender.pointer, streams.silenceBlock);
    takePackets(streams.loopbackCapture.pointer, loopPending, loopOrigin, loopOriginValid, loopFrames, frameStep);
    takePackets(streams.microphoneCapture.pointer, microphonePending, microphoneOrigin, microphoneOriginValid, microphoneFrames, frameStep);
    while (loopFrames.size() > 100) loopFrames.pop_front();
    while (!microphoneFrames.empty()) {
      Frame frame = microphoneFrames.front();
      microphoneFrames.pop_front();
      alignAndProcess(processor.get(), frame, loopFrames, qpcHz, streams.delayMs, lastReverse);
    }
  }

  streams.close();
  enumerator->UnregisterEndpointNotificationCallback(notify);
  enumerator.reset();
  processor = nullptr;
  CloseHandle(stop);
  CloseHandle(changed);
  if (multimedia) AvRevertMmThreadCharacteristics(multimedia);
  CoUninitialize();
  return 0;
}

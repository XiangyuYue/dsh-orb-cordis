// Throwaway experiment: does macOS VPIO cancel audio played by ANOTHER process?
// usage:
//   vpio list
//   vpio play <outDeviceSubstr> <in.wav> [gain]              (plain AUHAL output, "other app")
//   vpio rec  <raw|vpio> <inSubstr> <outSubstr> <secs> <out.f32> [selfplay.wav] [gain]
import AudioToolbox
import AVFoundation
import CoreAudio
import Foundation

func devices() -> [(AudioDeviceID, String, Bool, Bool)] {
  var addr = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDevices, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
  var size: UInt32 = 0
  AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size)
  var ids = [AudioDeviceID](repeating: 0, count: Int(size) / 4)
  AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &ids)
  return ids.map { id in
    var n: Unmanaged<CFString>?
    var s = UInt32(MemoryLayout<CFString?>.size)
    var a = AudioObjectPropertyAddress(mSelector: kAudioObjectPropertyName, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
    AudioObjectGetPropertyData(id, &a, 0, nil, &s, &n)
    func has(_ scope: AudioObjectPropertyScope) -> Bool {
      var a2 = AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyStreams, mScope: scope, mElement: kAudioObjectPropertyElementMain)
      var sz: UInt32 = 0
      AudioObjectGetPropertyDataSize(id, &a2, 0, nil, &sz)
      return sz > 0
    }
    return (id, (n?.takeRetainedValue() as String?) ?? "?", has(kAudioObjectPropertyScopeInput), has(kAudioObjectPropertyScopeOutput))
  }
}
func find(_ sub: String, input: Bool) -> AudioDeviceID {
  guard let d = devices().first(where: { $0.1.contains(sub) && (input ? $0.2 : $0.3) }) else { fatalError("no device \(sub)") }
  return d.0
}
func loadWav(_ path: String, gain: Float) -> [Float] {
  let f = try! AVAudioFile(forReading: URL(fileURLWithPath: path), commonFormat: .pcmFormatFloat32, interleaved: false)
  precondition(f.processingFormat.sampleRate == 16000 && f.processingFormat.channelCount == 1, "need 16k mono")
  let buf = AVAudioPCMBuffer(pcmFormat: f.processingFormat, frameCapacity: AVAudioFrameCount(f.length))!
  try! f.read(into: buf)
  return Array(UnsafeBufferPointer(start: buf.floatChannelData![0], count: Int(buf.frameLength))).map { $0 * gain }
}
func check(_ s: OSStatus, _ what: String) { if s != noErr { fputs("\(what) failed: \(s)\n", stderr); exit(2) } }

var fmt = AudioStreamBasicDescription(mSampleRate: 16000, mFormatID: kAudioFormatLinearPCM, mFormatFlags: kAudioFormatFlagIsFloat | kAudioFormatFlagIsPacked, mBytesPerPacket: 4, mFramesPerPacket: 1, mBytesPerFrame: 4, mChannelsPerFrame: 1, mBitsPerChannel: 32, mReserved: 0)

final class State { var unit: AudioUnit?; var play: [Float] = []; var cursor = 0; var rec: [Float] = []; var buf = [Float](repeating: 0, count: 8192); var calls = 0; var lastErr: OSStatus = 0 }
let st = State()

let renderCb: AURenderCallback = { ref, flags, _, _, frames, io in
  let s = Unmanaged<State>.fromOpaque(ref).takeUnretainedValue()
  let abl = UnsafeMutableAudioBufferListPointer(io!)
  let p = abl[0].mData!.assumingMemoryBound(to: Float.self)
  for i in 0..<Int(frames) { p[i] = s.cursor < s.play.count ? s.play[s.cursor] : 0; s.cursor += 1 }
  return noErr
}
let inputCb: AURenderCallback = { ref, flags, ts, bus, frames, _ in
  let s = Unmanaged<State>.fromOpaque(ref).takeUnretainedValue()
  return s.buf.withUnsafeMutableBytes { raw -> OSStatus in
    var abl = AudioBufferList(mNumberBuffers: 1, mBuffers: AudioBuffer(mNumberChannels: 1, mDataByteSize: frames * 4, mData: raw.baseAddress))
    let r = AudioUnitRender(s.unit!, flags, ts, 1, frames, &abl)
    s.calls += 1
    if r == noErr { s.rec.append(contentsOf: raw.bindMemory(to: Float.self).prefix(Int(frames))) } else { s.lastErr = r }
    return r
  }
}

func makeUnit(_ sub: OSType) -> AudioUnit {
  var desc = AudioComponentDescription(componentType: kAudioUnitType_Output, componentSubType: sub, componentManufacturer: kAudioUnitManufacturer_Apple, componentFlags: 0, componentFlagsMask: 0)
  var u: AudioUnit?
  check(AudioComponentInstanceNew(AudioComponentFindNext(nil, &desc)!, &u), "new")
  return u!
}

let a = CommandLine.arguments
switch a[1] {
case "list":
  for d in devices() { print(d.0, d.1, d.2 ? "in" : "", d.3 ? "out" : "") }
case "play":
  st.play = loadWav(a[3], gain: a.count > 4 ? Float(a[4])! : 1)
  let u = makeUnit(kAudioUnitSubType_HALOutput)
  var dev = find(a[2], input: false)
  check(AudioUnitSetProperty(u, kAudioOutputUnitProperty_CurrentDevice, kAudioUnitScope_Global, 0, &dev, 4), "dev")
  check(AudioUnitSetProperty(u, kAudioUnitProperty_StreamFormat, kAudioUnitScope_Input, 0, &fmt, UInt32(MemoryLayout.size(ofValue: fmt))), "fmt")
  var cb = AURenderCallbackStruct(inputProc: renderCb, inputProcRefCon: Unmanaged.passUnretained(st).toOpaque())
  check(AudioUnitSetProperty(u, kAudioUnitProperty_SetRenderCallback, kAudioUnitScope_Input, 0, &cb, UInt32(MemoryLayout<AURenderCallbackStruct>.size)), "cb")
  check(AudioUnitInitialize(u), "init"); check(AudioOutputUnitStart(u), "start")
  Thread.sleep(forTimeInterval: Double(st.play.count) / 16000 + 0.5)
  AudioOutputUnitStop(u)
case "rec":
  let vp = a[2] == "vpio" || a[2] == "bypass"
  let bypass = a[2] == "bypass"
  let secs = Double(a[5])!
  if a.count > 7 { st.play = [Float](repeating: 0, count: 16000) + loadWav(a[7], gain: a.count > 8 ? Float(a[8])! : 1) }
  let u = makeUnit(vp ? kAudioUnitSubType_VoiceProcessingIO : kAudioUnitSubType_HALOutput)
  st.unit = u
  var one: UInt32 = 1, zero: UInt32 = 0
  check(AudioUnitSetProperty(u, kAudioOutputUnitProperty_EnableIO, kAudioUnitScope_Input, 1, &one, 4), "enable in")
  if !vp { check(AudioUnitSetProperty(u, kAudioOutputUnitProperty_EnableIO, kAudioUnitScope_Output, 0, &zero, 4), "disable out") }
  var inDev = find(a[3], input: true)
  if !vp {
    var rate: Float64 = 0; var rs = UInt32(8)
    var ra = AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyNominalSampleRate, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
    AudioObjectGetPropertyData(inDev, &ra, 0, nil, &rs, &rate)
    fmt.mSampleRate = rate
    fputs("raw capture at device rate \(rate)\n", stderr)
  }
  check(AudioUnitSetProperty(u, kAudioOutputUnitProperty_CurrentDevice, kAudioUnitScope_Global, vp ? 1 : 0, &inDev, 4), "in dev")
  if vp {
    var outDev = find(a[4], input: false)
    check(AudioUnitSetProperty(u, kAudioOutputUnitProperty_CurrentDevice, kAudioUnitScope_Global, 0, &outDev, 4), "out dev")
    check(AudioUnitSetProperty(u, kAudioUnitProperty_StreamFormat, kAudioUnitScope_Input, 0, &fmt, UInt32(MemoryLayout.size(ofValue: fmt))), "fmt out")
    var cb = AURenderCallbackStruct(inputProc: renderCb, inputProcRefCon: Unmanaged.passUnretained(st).toOpaque())
    check(AudioUnitSetProperty(u, kAudioUnitProperty_SetRenderCallback, kAudioUnitScope_Input, 0, &cb, UInt32(MemoryLayout<AURenderCallbackStruct>.size)), "render cb")
    if #available(macOS 14.0, *) {
      var duck = AUVoiceIOOtherAudioDuckingConfiguration(mEnableAdvancedDucking: false, mDuckingLevel: .min)
      let r = AudioUnitSetProperty(u, kAUVoiceIOProperty_OtherAudioDuckingConfiguration, kAudioUnitScope_Global, 0, &duck, UInt32(MemoryLayout<AUVoiceIOOtherAudioDuckingConfiguration>.size))
      fputs("ducking config set: \(r)\n", stderr)
    }
    if bypass {
      var b: UInt32 = 1
      check(AudioUnitSetProperty(u, kAUVoiceIOProperty_BypassVoiceProcessing, kAudioUnitScope_Global, 0, &b, 4), "bypass")
    }
  }
  check(AudioUnitSetProperty(u, kAudioUnitProperty_StreamFormat, kAudioUnitScope_Output, 1, &fmt, UInt32(MemoryLayout.size(ofValue: fmt))), "fmt in")
  var icb = AURenderCallbackStruct(inputProc: inputCb, inputProcRefCon: Unmanaged.passUnretained(st).toOpaque())
  check(AudioUnitSetProperty(u, kAudioOutputUnitProperty_SetInputCallback, kAudioUnitScope_Global, 1, &icb, UInt32(MemoryLayout<AURenderCallbackStruct>.size)), "input cb")
  let t0 = Date()
  check(AudioUnitInitialize(u), "init"); check(AudioOutputUnitStart(u), "start")
  fputs("started in \(Date().timeIntervalSince(t0))s\n", stderr)
  if let other = ProcessInfo.processInfo.environment["OTHER_PLAY"] {
    let delay = Double(ProcessInfo.processInfo.environment["OTHER_DELAY"] ?? "1.0")!
    Thread.sleep(forTimeInterval: delay)
    let p = Process()
    p.executableURL = URL(fileURLWithPath: CommandLine.arguments[0])
    p.arguments = ["play", "MacBook Air扬声器", other, "1.0"]
    try! p.run()
    Thread.sleep(forTimeInterval: secs - delay)
  } else {
    Thread.sleep(forTimeInterval: secs)
  }
  AudioOutputUnitStop(u)
  let data = st.rec.withUnsafeBufferPointer { Data(buffer: $0) }
  try! data.write(to: URL(fileURLWithPath: a[6]))
  fputs("recorded \(st.rec.count) samples, callbacks \(st.calls), lastErr \(st.lastErr), mic auth \(AVCaptureDevice.authorizationStatus(for: .audio).rawValue)\n", stderr)
default: break
}

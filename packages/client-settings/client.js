window.__ModuleLoader__.load({
  id: '@dsh-orb/client-ui-settings-orb',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    const zh = {
      nav: '悬浮球',
      intro: '更改写入当前配置。',
      linux: '悬浮球在 Linux 上不可用。',
      error: '无法加载悬浮球设置。',
      saveError: '无法保存。',
      helperFailedTitle: '悬浮球没能启动',
      helperFailed: '悬浮球多次退出，已经停止重试。点「重试」立刻再拉起一次。',
      runtimeFailedTitle: '悬浮球运行时下载失败',
      runtimeFailed: '下载没有完成，所以球没有出现。点「重新下载」立即接着下——已经下好的部分不会重来，也不用重启应用。',
      permissionFallback: '权限设置无法读取，已改为工作区内修改。',
      retry: '重试',
      redownload: '重新下载',
      ball: '启用悬浮球',
      ballDescription: '关闭后插件仍在，Computer Use 仍可在主窗口使用。',
      avatarTitle: '悬浮球头像',
      avatarDescription: '点一张内置动图，或选择自己的图片。上传支持 GIF、PNG、WebP，{limit} MB 以内。',
      avatarAlt: '悬浮球头像预览',
      avatarBuiltin: '内置动图',
      avatarMore: '更多动图',
      avatarMoreHint: '在图库 dshgif.hicp.fun 里浏览并下载更多动图',
      avatarPresetNames: {
        point: '指点',
        rice: '干饭',
        heart: '比心',
        cheer: '欢呼',
        cheeks: '托腮',
        smile: '微笑',
      },
      chooseImage: '选择图片',
      restoreDefault: '恢复默认',
      tooLarge: '图片超过 {limit} MB。',
      tooLargeSize: '图片 {size} MB，超过 {limit} MB 上限。',
      unreadable: '读不到这个文件，请重新选择一次。',
      invalidType: '请选择 GIF、PNG 或 WebP 图片。',
      overlayTitle: '悬浮球 Agent',
      overlayDescription: '悬浮球 Computer Use 会话使用的模型与思考强度。',
      backgroundTitle: '后台 Agent',
      backgroundDescription: '新建后台 code_agent 会话使用的模型与思考强度。',
      emptyCatalog: '暂无可用模型。',
      defaultEffort: '默认',
      millifractionTitle: '千分比坐标',
      millifractionDescription: '新建对话使用截图的 0–1000 比例。关闭后使用已附加图片的像素。更改此项会新建对话。',
      millifractionToggle: '使用千分比坐标',
      millifractionConfirm: '新编码只在新对话中生效。当前对话不变，仍可从历史记录打开。取消不写入、不新建。',
      frameTitle: '观察框彩带',
      frameDescription: 'Computer Use 操作某个窗口时，窗口周围显示这条彩带。关闭后不再显示。',
      frameToggle: '显示观察框彩带',
      runtimePreparingTitle: '正在下载悬浮球运行时',
      runtimePreparing: '首次使用需要下载约 124–150 MB 的运行时，完成后悬浮球会自动出现。下载被中断或长时间不动时，点「重新下载」立即接着下。',
      tccTitle: 'Mac 权限',
      tccDescription: 'Computer Use 需要屏幕录制与辅助功能。点按钮打开系统设置对应页。',
      tccAppHint: '在列表里打开 {name}。',
      tccScreenName: '屏幕录制',
      tccScreenReason: '让 agent 看见当前窗口。',
      tccScreenPath: '系统设置 → 隐私与安全性 → 屏幕录制',
      tccScreenOpen: '打开「屏幕录制」设置',
      tccAccessibilityName: '辅助功能',
      tccAccessibilityReason: '让 agent 点击和输入。',
      tccAccessibilityPath: '系统设置 → 隐私与安全性 → 辅助功能',
      tccAccessibilityOpen: '打开「辅助功能」设置',
      tccMissing: '未开启',
      tccGranted: '已开启',
      tccRelaunch: '已开启，请退出后重开',
      tccFooter: '打开开关后必须完全退出 {name} 再打开。只关主窗口无效。',
      updateTitle: '插件更新',
      updateCurrent: '当前版本 {version}。',
      updateAvailable: '新版本 {version} 可用。',
      updateNow: '更新',
      updating: '正在更新到 {version}…',
      updateDone: '已更新到 {version}，重启 {name} 后生效。',
      updateDeferred: '{version} 将在退出 {name} 后自动安装，请完全退出后稍等片刻再重新打开。',
      updateInstalling: '更新正在安装中，安装完成前请不要退出 {name}。',
      updateFailed: '更新失败：',
      updateOffline: '无法连接镜像或 npm，请检查网络后重试。',
      updateBuildBlocked: '新版本依赖的安装脚本未获授权，安装已停止。',
      updateAlreadyInstalled: '当前 Harness 不允许覆盖已安装的插件，请在插件页移除后再安装新版本。',
      updateAllowBuilds: '允许安装脚本并重试',
      updateCheck: '检查更新',
      updateChecking: '正在检查…',
      updateAuto: '自动检查更新',
      updateAutoDescription: '每天一次向 npmmirror（失败回退 npm）查询新版本，不发送任何标识信息。',
      updateManual: '当前 Harness 没有提供插件管理服务，请在插件页手动更新。',
      workspaceTitle: 'Agent 工作区',
      workspaceDescription: '悬浮球 Agent 的新会话会创建在这里。切换后旧目录内容保持不变，也可以随时恢复默认工作区。',
      workspaceCurrent: '当前工作区：',
      workspaceDefault: '默认',
      workspaceCustom: '自定义',
      workspacePick: '选择…',
      workspacePicking: '选择中…',
      workspacePickFailed: '无法打开系统目录选择器。',
      workspacePickerUnavailable: '当前环境不支持系统目录选择。',
      workspaceUseDefault: '恢复默认工作区',
      workspaceChanged: '工作区已切换。',
      workspaceInvalidPath: '请输入绝对路径。',
      workspaceNotFound: '目录不存在。',
      workspaceNotDirectory: '这个路径不是目录。',
      workspaceNotEmpty: '目录不是空的，请选择一个空目录。',
      workspaceNotReadable: '无法读取这个目录，请检查权限。',
      workspaceRunning: '悬浮球当前会话正在运行，请等它结束后再修改。',
      workspaceCreateFailed: '切换工作区失败，请重试。',
      workspaceUnavailable: '当前 Harness 不支持修改工作区。',
      workspaceChanging: '正在切换…',
      workspaceDialogTitle: '切换 Agent 工作区',
      workspaceDialogBody: '工作区将从 {old} 改为 {new}。',
      workspaceDialogKeep: '旧工作区中的会话和文件会保持不变，不会被移动或删除。',
      workspaceDialogCancel: '取消',
      workspaceDialogConfirm: '确定',
      historyTitle: '旧会话清理',
      historyDescription: '超过保留期限的会话会自动清理到系统回收站，只处理悬浮球工作区。',
      historyRetention: '保留期限',
      historyForever: '永久保留',
      historyDaysOption: '{days} 天',
      historyWorkspace: '工作区：{path}',
      historyRestoreHint: '在系统废纸篓/回收站放回会话文件夹即可恢复；恢复后的会话不会再被自动清理。',
      historyWarning: '有 {count} 个悬浮球会话无法读取，本次只清理了会话目录，截图暂时保留。',
      historyDialogTitle: '修改保留期限',
      historyDialogScanning: '正在扫描超过 {days} 天的会话…',
      historyDialogRetry: '重试',
      historyDialogDelete: '确认后，将把 {count} 个会话清理到系统回收站。',
      historyDialogNoDelete: '当前没有超过 {days} 天的会话需要立即清理。',
      historyDialogKeep: '以后只保留最近 {days} 天的会话。',
      historyDialogForever: '确认后改为永久保留，不再自动清理会话，也不会删除任何内容。',
      historyDialogMore: '还有 {count} 个会话…',
      historyDialogUnnamed: '未命名会话',
      historyDialogCancel: '取消',
      historyDialogConfirm: '确定',
      historyPreviewFailed: '无法计算要清理的会话，请重试。',
      historyLast: '上次清理：{sessions} 个会话。',
      historyCleaning: '正在清理…',
      historyRestoring: '正在从系统回收站还原…',
      historyUnavailable: '当前 Harness 或系统回收站不支持清理会话。',
      historyFailed: '清理失败：',
      voiceTitle: '语音',
      voiceIntro: '唤醒、语音输入和播报可以单独关掉。模型还没准备好时，对应的一项不会发生。',
      voiceMicBody: '没有拿到麦克风，唤醒和语音输入都不会发生。球的其他功能照常。',
      voiceMicOpen: '打开「麦克风」设置',
      voiceOn: '已开启',
      voiceOff: '已关闭',
      wakeTitle: '语音唤醒',
      wakeToggle: '语音唤醒',
      wakeDesc: '说一句唤醒词，悬浮球就会醒过来。',
      wakeThreshold: '灵敏度',
      wakeThresholdHint: '越低越容易被唤醒；环境吵时调高，可以减少误触发。',
      wakeScore: '增强分',
      wakeScoreHint: '给唤醒词加权的程度，环境吵时可适当调高。',
      wakeChunk: '判定粒度',
      wakeChunk8: '160 毫秒',
      wakeChunk16: '320 毫秒',
      wakeChunkHint: '每次判定的音频长度，越长越省电，反应稍慢。',
      wakeCooldown: '冷却（秒）',
      wakeCooldownHint: '一次唤醒后，这段时间内不再响应新的唤醒词。',
      wakeWords: '唤醒词',
      wakeWordsHint: '一行一条，留空表示不启用唤醒。',
      wakeReply: '唤醒后的回复语',
      downloadWake: '下载语音唤醒模型',
      commandTitle: '语音输入',
      commandToggle: '语音输入',
      commandDesc: '把说的话识别成文字交给悬浮球，也可以中途插话或让它退下。',
      interjectKeyword: '插话关键词',
      interjectHint: '按拼音匹配，同音字自动生效，不需要另填别名。',
      dismissPhrases: '退下口令',
      dismissHint: '两个字以上的口令按拼音匹配，同音字自动生效。',
      dismissReply: '退下后的回复语',
      downloadAsr: '启动 ASR 语音模型',
      ttsTitle: 'TTS',
      ttsToggle: 'TTS',
      ttsDesc: '回复时用语音念出来，可选本地模型或千问。',
      ttsBackend: '播报方式',
      ttsBackendLocal: '本地模型',
      ttsBackendQwen: '千问',
      qwenApiKey: 'API Key',
      qwenApiKeyHint: '留空时不播报。',
      qwenVoice: '音色',
      qwenVoiceStandard: '普通话与多语种',
      qwenVoiceDialect: '方言',
      qwenSpeed: '语速',
      qwenSpeedHint: '0.5 最慢，2.0 最快。',
      questionPrompt: '提问提示语',
      questionPromptHint: '打开提问卡片时念这句话，留空则不播报。',
      ttsSpeed: '语速',
      ttsSpeedHint: '1.0 为原速，数值越大语速越快。',
      ttsVolume: '音量',
      ttsVolumeHint: '100% 为模型原始音量，最高可放大到 200%。',
      downloadTts: '下载 TTS 语音播报模型',
      idleTitle: '空闲后取消固定',
      idleDesc: '悬浮球被固定后，闲置一段时间会自动取消固定。',
      idleSeconds: '空闲时长（秒）',
      idleHint: '从最后一次操作悬浮球开始计算。',
      voiceWakeModel: '唤醒模型',
      voiceAsrModel: '识别模型',
      voiceTtsModel: '播报模型',
      voiceTtsLocalModel: '本地播报模型',
      voiceModelReady: '已就绪',
      voiceModelMissing: '未下载 · {size}',
      voiceModelDownloading: '正在下载…',
      voiceModelOptional: '千问播报不需要这个模型',
      voiceRedownload: '重新下载',
      modelMissingWake: '要下载语音唤醒模型。',
      modelMissingTts: '要下载 TTS 模型。',
      modelMissingAsr: '要启动 ASR 语音模型。',
      asrService: '当前 DeepSeek Harness 没有官方语音识别服务，插件不会自己另下一份。',
      modelPresent: '模型已经存在，不需要重新下载',
      voiceDownload: '下载',
      voiceCancel: '取消',
      voiceClose: '确定',
      voiceSource: '来源',
      voiceSize: '约 {size} MB',
      voiceProgress: '已下载 {percent}%',
    }
    const en = {
      nav: 'Floating ball',
      intro: 'Changes are saved in the current profile.',
      linux: 'The floating ball is not available on Linux.',
      error: 'Could not load floating-ball settings.',
      saveError: 'Could not save.',
      helperFailedTitle: 'The floating ball could not start',
      helperFailed: 'The floating ball exited too many times and stopped retrying. Retry starts it again right away.',
      runtimeFailedTitle: 'The floating-ball runtime download failed',
      runtimeFailed: 'The download did not finish, so no ball appeared. Download again picks up where it stopped — the bytes already here are kept, and no app restart is needed.',
      permissionFallback: 'The permission file could not be read. Access is now Workspace Write.',
      retry: 'Retry',
      redownload: 'Download again',
      ball: 'Enable the floating ball',
      ballDescription: 'Turning this off keeps the plugin loaded. Computer Use stays available in the main window.',
      avatarTitle: 'Ball image',
      avatarDescription: 'Pick a built-in animation, or choose your own image. Uploads accept GIF, PNG, and WebP up to {limit} MB.',
      avatarAlt: 'Floating-ball image preview',
      avatarBuiltin: 'Built-in animations',
      avatarMore: 'More animations',
      avatarMoreHint: 'Browse and download more animations from the dshgif.hicp.fun gallery',
      avatarPresetNames: {
        point: 'Point',
        rice: 'Rice',
        heart: 'Heart',
        cheer: 'Cheer',
        cheeks: 'Cheeks',
        smile: 'Smile',
      },
      chooseImage: 'Choose image',
      restoreDefault: 'Restore default',
      tooLarge: 'The image is larger than {limit} MB.',
      tooLargeSize: 'The image is {size} MB — over the {limit} MB limit.',
      unreadable: 'That file could not be read. Choose it again.',
      invalidType: 'Choose a GIF, PNG, or WebP image.',
      overlayTitle: 'Floating-ball Agent',
      overlayDescription: 'Model and reasoning effort for the ball\'s Computer Use session.',
      backgroundTitle: 'Background Agent',
      backgroundDescription: 'Model and reasoning effort for new background code_agent sessions.',
      emptyCatalog: 'No models available.',
      defaultEffort: 'Default',
      millifractionTitle: 'Millifraction coordinates',
      millifractionDescription: 'New chats use 0–1000 fractions of the screenshot. Turn off to use pixels of the attached image. Changing this creates a new conversation.',
      millifractionToggle: 'Use millifraction coordinates',
      millifractionConfirm: 'The new encoding takes effect in a new conversation. The current conversation stays unchanged and remains in History. Cancel leaves the default and this chat as they are.',
      frameTitle: 'Observation ribbon',
      frameDescription: 'Draws the coloured ribbon around the window Computer Use is working on. Turn it off to hide it.',
      frameToggle: 'Show the observation ribbon',
      runtimePreparingTitle: 'Downloading the floating-ball runtime',
      runtimePreparing: 'The first launch downloads a ~124–150 MB runtime, then the ball appears on its own. If the download was interrupted or looks stuck, Download again picks it up from where it stopped.',
      tccTitle: 'Mac permissions',
      tccDescription: 'Computer Use needs Screen Recording and Accessibility. Each button opens that System Settings pane.',
      tccAppHint: 'In the list, turn on {name}.',
      tccScreenName: 'Screen Recording',
      tccScreenReason: 'Lets the agent see the current window.',
      tccScreenPath: 'System Settings → Privacy & Security → Screen Recording',
      tccScreenOpen: 'Open Screen Recording settings',
      tccAccessibilityName: 'Accessibility',
      tccAccessibilityReason: 'Lets the agent click and type.',
      tccAccessibilityPath: 'System Settings → Privacy & Security → Accessibility',
      tccAccessibilityOpen: 'Open Accessibility settings',
      tccMissing: 'Off',
      tccGranted: 'On',
      tccRelaunch: 'On — quit and reopen',
      tccFooter: 'After you turn the switches on, quit {name} fully, then open it again. Closing the main window does not quit.',
      updateTitle: 'Plugin update',
      updateCurrent: 'Version {version}.',
      updateAvailable: 'Version {version} is available.',
      updateNow: 'Update',
      updating: 'Updating to {version}…',
      updateDone: 'Updated to {version}. Restart {name} to apply it.',
      updateDeferred: '{version} installs once {name} quits. Quit it fully, wait a moment, then reopen it.',
      updateInstalling: 'The update is installing now. Do not quit {name} until it finishes.',
      updateFailed: 'Update failed: ',
      updateOffline: 'no registry could be reached. Check the network and try again.',
      updateBuildBlocked: 'A dependency of the new version needs install-script approval, so the install stopped.',
      updateAlreadyInstalled: 'This Harness build refuses to install over a plugin that is already installed. Remove it on the Plugins page, then install the new version.',
      updateAllowBuilds: 'Allow these scripts and retry',
      updateCheck: 'Check for updates',
      updateChecking: 'Checking…',
      updateAuto: 'Check for updates automatically',
      updateAutoDescription: 'Asks npmmirror once a day (falling back to npm) for the newest version. Nothing identifying is sent.',
      updateManual: 'This Harness build ships no plugin manager — update from the Plugins page instead.',
      workspaceTitle: 'Agent workspace',
      workspaceDescription: 'New floating-ball Agent conversations are created here. The old directory is left untouched, and you can restore the default workspace at any time.',
      workspaceCurrent: 'Current workspace: ',
      workspaceDefault: 'default',
      workspaceCustom: 'custom',
      workspacePick: 'Choose…',
      workspacePicking: 'Choosing…',
      workspacePickFailed: 'Could not open the system directory picker.',
      workspacePickerUnavailable: 'This environment cannot open a system directory picker.',
      workspaceUseDefault: 'Restore default workspace',
      workspaceChanged: 'Workspace changed.',
      workspaceInvalidPath: 'Enter an absolute path.',
      workspaceNotFound: 'The directory does not exist.',
      workspaceNotDirectory: 'That path is not a directory.',
      workspaceNotEmpty: 'The directory is not empty. Choose an empty directory.',
      workspaceNotReadable: 'The directory cannot be read. Check its permissions.',
      workspaceRunning: 'The floating-ball conversation is running. Wait for it to finish before changing the workspace.',
      workspaceCreateFailed: 'Could not change the workspace. Try again.',
      workspaceUnavailable: 'This Harness build cannot change the workspace.',
      workspaceChanging: 'Switching…',
      workspaceDialogTitle: 'Change Agent workspace',
      workspaceDialogBody: 'The workspace will change from {old} to {new}.',
      workspaceDialogKeep: 'Conversations and files in the old workspace stay unchanged; nothing is moved or deleted.',
      workspaceDialogCancel: 'Cancel',
      workspaceDialogConfirm: 'Confirm',
      historyTitle: 'Old conversations',
      historyDescription: 'Conversations past the retention period are moved to the system trash. Only the floating-ball workspace is cleaned.',
      historyRetention: 'Keep for',
      historyForever: 'Keep forever',
      historyDaysOption: '{days} days',
      historyWorkspace: 'Workspace: {path}',
      historyRestoreHint: 'Put a conversation folder back from the system trash to restore it; a restored conversation will not be cleaned automatically again.',
      historyWarning: '{count} floating-ball conversations could not be read. Their session folders were cleaned, but screenshots were kept for now.',
      historyDialogTitle: 'Change retention',
      historyDialogScanning: 'Scanning conversations older than {days} days…',
      historyDialogRetry: 'Retry',
      historyDialogDelete: 'This will move {count} conversations to the system trash.',
      historyDialogNoDelete: 'No conversations are older than {days} days right now.',
      historyDialogKeep: 'Afterwards only conversations from the last {days} days are kept.',
      historyDialogForever: 'Afterwards conversations are kept forever and will not be cleaned automatically. Nothing is deleted.',
      historyDialogMore: 'and {count} more conversations…',
      historyDialogUnnamed: 'Untitled conversation',
      historyDialogCancel: 'Cancel',
      historyDialogConfirm: 'Confirm',
      historyPreviewFailed: 'Could not calculate what to clean. Try again.',
      historyLast: 'Last cleanup: {sessions} conversations.',
      historyCleaning: 'Cleaning…',
      historyRestoring: 'Restoring from the system trash…',
      historyUnavailable: 'This Harness build or the system trash cannot clean up conversations.',
      historyFailed: 'Cleanup failed: ',
      voiceTitle: 'Voice',
      voiceIntro: 'Wake word, voice input, and speech can each be turned off. A column whose model is not ready does not run.',
      voiceMicBody: 'The microphone is not available, so wake word and voice input do not run. The rest of the ball still works.',
      voiceMicOpen: 'Open Microphone settings',
      voiceOn: 'On',
      voiceOff: 'Off',
      wakeTitle: 'Wake word',
      wakeToggle: 'Wake word',
      wakeDesc: 'Say a wake word and the floating ball wakes up.',
      wakeThreshold: 'Sensitivity',
      wakeThresholdHint: 'Lower wakes more easily. Raise it in noisy rooms to cut false wakes.',
      wakeScore: 'Boost',
      wakeScoreHint: 'How strongly a wake word is boosted. Raise it in noisy rooms.',
      wakeChunk: 'Chunk',
      wakeChunk8: '160 ms',
      wakeChunk16: '320 ms',
      wakeChunkHint: 'Audio window per decision. Longer saves power and reacts a little slower.',
      wakeCooldown: 'Cooldown (seconds)',
      wakeCooldownHint: 'After one wake, new wake words are ignored for this long.',
      wakeWords: 'Wake words',
      wakeWordsHint: 'One per line. Empty means no wake word.',
      wakeReply: 'Reply after wake',
      downloadWake: 'Download wake-word model',
      commandTitle: 'Voice input',
      commandToggle: 'Voice input',
      commandDesc: 'Speech becomes text for the ball; you can also interject or dismiss it.',
      interjectKeyword: 'Interjection keyword',
      interjectHint: 'Matched by pinyin; homophones work automatically, no aliases needed.',
      dismissPhrases: 'Dismiss phrases',
      dismissHint: 'Phrases of two or more syllables match by pinyin; homophones work automatically.',
      dismissReply: 'Reply after dismiss',
      downloadAsr: 'Start ASR speech model',
      ttsTitle: 'TTS',
      ttsToggle: 'TTS',
      ttsDesc: 'Read replies aloud with the local model or Qwen.',
      ttsBackend: 'Speech backend',
      ttsBackendLocal: 'Local model',
      ttsBackendQwen: 'Qwen',
      qwenApiKey: 'API Key',
      qwenApiKeyHint: 'Nothing is spoken while this is empty.',
      qwenVoice: 'Voice',
      qwenVoiceStandard: 'Mandarin and multilingual',
      qwenVoiceDialect: 'Dialects',
      qwenSpeed: 'Speed',
      qwenSpeedHint: '0.5 is slowest, 2.0 is fastest.',
      questionPrompt: 'Question prompt',
      questionPromptHint: 'Spoken when the question card opens. Empty means silence.',
      ttsSpeed: 'Speed',
      ttsSpeedHint: '1.0 is normal speed; higher speaks faster.',
      ttsVolume: 'Volume',
      ttsVolumeHint: '100% is the model\'s own level; up to 200% boosts it.',
      downloadTts: 'Download TTS speech model',
      idleTitle: 'Unpin after idle',
      idleDesc: 'While pinned, the ball unpins itself after this much idle time.',
      idleSeconds: 'Idle time (seconds)',
      idleHint: 'Counted from the last interaction with the ball.',
      voiceWakeModel: 'Wake model',
      voiceAsrModel: 'Recognition model',
      voiceTtsModel: 'Speech model',
      voiceTtsLocalModel: 'Local speech model',
      voiceModelReady: 'Ready',
      voiceModelMissing: 'Not downloaded · {size}',
      voiceModelDownloading: 'Downloading…',
      voiceModelOptional: 'Qwen does not need this model',
      voiceRedownload: 'Download again',
      modelMissingWake: 'Download the wake-word model.',
      modelMissingTts: 'Download the TTS model.',
      modelMissingAsr: 'Start the ASR speech model.',
      asrService: 'This DeepSeek Harness has no official speech service, so the plugin will not download another copy.',
      modelPresent: 'The model is already present; there is no need to download it again.',
      voiceDownload: 'Download',
      voiceCancel: 'Cancel',
      voiceClose: 'OK',
      voiceSource: 'Source',
      voiceSize: 'about {size} MB',
      voiceProgress: '{percent}% downloaded',
    }

    // The community GIF gallery behind the "more animations" tile. It is a plain
    // outbound link: the desktop shell hands http(s) window opens to the system
    // browser, and a page served in a browser just opens a tab.
    const AVATAR_GALLERY_URL = 'https://dshgif.hicp.fun/'

    /**
     * Upload cap, mirroring the host's MAX_AVATAR_BYTES. The check here is for the
     * message, not for safety: it turns a rejected upload into a sentence with the file's
     * own size in it, instead of a 413 the page can only report as "too large".
     */
    const AVATAR_MAX_BYTES = 4 * 1024 * 1024
    const AVATAR_MAX_MB = String(AVATAR_MAX_BYTES / (1024 * 1024))

    /** One decimal below 10 MB, whole numbers above: 3.4 MB, 12 MB. */
    function megabytes(bytes) {
      const value = bytes / (1024 * 1024)
      return value >= 10 ? value.toFixed(0) : value.toFixed(1)
    }

    // The main window's resolved locale rides <html lang> (dsh-client-locale);
    // a page without it falls back to the browser languages.
    function copy() {
      const lang = `${document.documentElement?.lang || ''}${navigator.language || ''}`
      return lang.toLowerCase().startsWith('zh') ? zh : en
    }

    function h(tag, props, ...children) {
      return React.createElement(tag, props, ...children)
    }

    async function request(path, options) {
      const response = await fetch(path, {
        cache: 'no-store',
        ...options,
        headers: {
          accept: 'application/json',
          ...(options && options.headers ? options.headers : {}),
        },
      })
      const text = await response.text()
      let body = null
      if (text) {
        try {
          body = JSON.parse(text)
        } catch {
          body = { error: text.slice(0, 200) }
        }
      }
      if (!response.ok) {
        const error = new Error(body && body.error ? body.error : 'request failed')
        error.status = response.status
        throw error
      }
      return body
    }

    function findModel(catalog, selection) {
      const groups = catalog && catalog.groups ? catalog.groups : []
      for (const group of groups) {
        if (!selection || group.id !== selection.provider) continue
        for (const model of group.models || []) {
          if (model.id === selection.model) return model
        }
      }
      return undefined
    }

    function Toggle(props) {
      return h('button', {
        type: 'button',
        role: 'switch',
        className: `dsh-orb-set-switch${props.checked ? ' is-on' : ''}${props.locked ? ' is-locked' : ''}`,
        'aria-checked': props.checked ? 'true' : 'false',
        'aria-disabled': props.locked ? 'true' : undefined,
        'aria-label': props.label,
        disabled: props.disabled,
        onClick: () => {
          if (props.disabled) return
          if (props.locked) {
            props.onLocked()
            return
          }
          props.onChange(!props.checked)
        },
      })
    }

    function ModelPicker(props) {
      const text = copy()
      const groups = props.catalog && props.catalog.groups ? props.catalog.groups : []
      const current = props.current || { provider: '', model: '' }
      const value = `${current.provider}\u001f${current.model}`
      const known = findModel(props.catalog, current)
      const options = []
      if (!known && current.provider && current.model) {
        options.push(h('option', { key: value, value }, `${current.provider} / ${current.model}`))
      }
      for (const group of groups) {
        options.push(h('optgroup', { key: group.id, label: group.name },
          ...(group.models || []).map((model) => h('option', {
            key: `${group.id}\u001f${model.id}`,
            value: `${group.id}\u001f${model.id}`,
          }, model.name))))
      }
      const efforts = known && known.reasoning ? known.reasoning.efforts || [] : []
      return h('div', { className: 'dsh-orb-set-pickers' },
        h('select', {
          'aria-label': props.label,
          disabled: props.disabled || (options.length === 0),
          value: options.length === 0 ? '' : value,
          onChange: (event) => {
            const [provider, model] = String(event.target.value).split('\u001f')
            if (!provider || !model) return
            const next = findModel(props.catalog, { provider, model })
            const effort = next && next.reasoning ? next.reasoning.defaultEffort : undefined
            props.onSelect(effort ? { provider, model, reasoningEffort: effort } : { provider, model })
          },
        }, options.length === 0 ? h('option', { value: '' }, text.emptyCatalog) : options),
        efforts.length === 0 ? null : h('select', {
          'aria-label': text.defaultEffort,
          disabled: props.disabled,
          value: current.reasoningEffort || known.reasoning.defaultEffort || efforts[0].id,
          onChange: (event) => {
            props.onSelect({ provider: current.provider, model: current.model, reasoningEffort: event.target.value })
          },
        }, efforts.map((effort) => h('option', { key: effort.id, value: effort.id }, effort.name || effort.id))))
    }

    function statusText(text, state) {
      if (state === 'granted') return text.tccGranted
      if (state === 'needsRelaunch') return text.tccRelaunch
      return text.tccMissing
    }

    function OrbSettingsSection() {
      const text = copy()
      // Re-render when the app's locale changes (<html lang>), so every copy()
      // call in this section re-evaluates against the new language.
      const [, bumpLocale] = React.useState(0)
      React.useEffect(() => {
        if (typeof MutationObserver !== 'function' || !document.documentElement) return undefined
        const observer = new MutationObserver(() => { bumpLocale((count) => count + 1) })
        observer.observe(document.documentElement, { attributeFilter: ['lang'] })
        return () => { observer.disconnect() }
      }, [])
      const [state, setState] = React.useState({
        status: 'loading',
        error: '',
        snapshot: null,
        catalog: { groups: [] },
        busy: false,
        avatarError: '',
        /** Size of the file that failed the check, 0 when only the host knows it. */
        avatarSize: 0,
      })

      // Responses overtake each other: a focus-triggered load, a poll, and a save can all be
      // in flight. Every request takes a ticket, and a GET only lands while it is still the
      // newest request in line and no save has settled since it was sent — a stale GET can
      // neither undo a save nor be trusted for state the host changed after answering it.
      // Refs, not locals: the component body re-runs on every render, so a `let` here would
      // give the mount/poll closures and the click handlers different counters.
      const requestSeq = React.useRef(0)
      const saveSeq = React.useRef(0)
      const settledSaves = React.useRef(0)
      const openSaves = React.useRef(0)

      /** Place in line for one request, plus the save count it was sent with. */
      function takeTicket(isSave) {
        const ticket = { seq: ++requestSeq.current, saves: settledSaves.current, save: 0 }
        if (isSave) {
          openSaves.current += 1
          ticket.save = ++saveSeq.current
        }
        return ticket
      }

      /** Apply a GET response, unless a newer request started or a save settled after it. */
      function applyGet(ticket, next) {
        if (ticket.seq !== requestSeq.current || ticket.saves !== settledSaves.current) return
        setState(next)
      }

      /**
       * Settle a save: only the newest save that started writes its snapshot, and the
       * fieldset is re-enabled once no save is left in flight — even when this response
       * lost the race and was dropped.
       */
      function settleSave(ticket, next) {
        settledSaves.current += 1
        openSaves.current -= 1
        if (ticket.save === saveSeq.current) setState(next)
        if (openSaves.current <= 0) {
          openSaves.current = 0
          setState((prev) => (prev.busy ? { ...prev, busy: false } : prev))
        }
      }

      async function load() {
        const ticket = takeTicket(false)
        setState((prev) => ({ ...prev, status: prev.snapshot ? prev.status : 'loading', error: '', avatarError: '', avatarSize: 0 }))
        try {
          const [snapshot, catalog] = await Promise.all([
            request('/.dsh-orb/settings'),
            request('/.dsh-orb/models'),
          ])
          applyGet(ticket, { status: 'ready', error: '', snapshot, catalog: catalog || { groups: [] }, busy: false, avatarError: '', avatarSize: 0 })
        } catch (error) {
          applyGet(ticket, (prev) => ({
            ...prev,
            status: 'error',
            busy: false,
            error: error instanceof Error ? error.message : String(error),
          }))
        }
      }

      React.useEffect(() => {
        void load()
        const onFocus = () => { void load() }
        window.addEventListener?.('focus', onFocus)
        return () => { window.removeEventListener?.('focus', onFocus) }
      }, [])

      // An install runs for minutes inside the host; the page polls it instead of holding a request open.
      // `installing` is polled too: the host clears it when the waited install finishes, and a
      // page that only polled `updating` would keep telling the user not to quit.
      const installing = state.snapshot?.update?.updating === true || state.snapshot?.update?.installing === true
      React.useEffect(() => {
        if (!installing) return undefined
        const timer = setInterval(() => { void refreshUpdate() }, 2000)
        return () => { clearInterval(timer) }
      }, [installing])

      // The first launch prepares the helper runtime inside the host; poll until
      // the ball lands or the failure surfaces, so the waiting line tracks it.
      const preparing = typeof state.snapshot?.helperPhase === 'string' && state.snapshot.helperPhase !== ''
      React.useEffect(() => {
        if (!preparing) return undefined
        const timer = setInterval(() => { void refreshSettings() }, 2000)
        return () => { clearInterval(timer) }
      }, [preparing])

      const voiceModels = state.snapshot && state.snapshot.voiceModels
      const voiceDownloading = Boolean(voiceModels && ['wake', 'tts', 'asr'].some((kind) => voiceModels[kind] && voiceModels[kind].downloading))
      React.useEffect(() => {
        if (!voiceDownloading) return undefined
        const timer = setInterval(() => { void refreshSettings() }, 1000)
        return () => { clearInterval(timer) }
      }, [voiceDownloading])

      async function refreshSettings() {
        const ticket = takeTicket(false)
        try {
          const snapshot = await request('/.dsh-orb/settings')
          applyGet(ticket, (prev) => prev.snapshot ? { ...prev, snapshot } : prev)
        } catch {
          // Keep the last known state; the next poll or a page reload tries again.
        }
      }

      async function refreshUpdate() {
        const ticket = takeTicket(false)
        try {
          const update = await request('/.dsh-orb/update')
          applyGet(ticket, (prev) => prev.snapshot ? { ...prev, snapshot: { ...prev.snapshot, update } } : prev)
        } catch {
          // Keep the last known state; the next poll or a page reload tries again.
        }
      }

      async function refreshHistory() {
        const ticket = takeTicket(false)
        try {
          const history = await request('/.dsh-orb/history')
          applyGet(ticket, (prev) => prev.snapshot ? { ...prev, snapshot: { ...prev.snapshot, history } } : prev)
        } catch {
          // Keep the last known state; the next poll or a page reload tries again.
        }
      }

      async function mutate(path, body, avatarError) {
        // This save outranks every GET already in flight (the confirm-dialog focus load, a
        // poll), and every GET sent before it settles.
        const ticket = takeTicket(true)
        setState((prev) => ({ ...prev, busy: true, avatarError: avatarError || '' }))
        try {
          const snapshot = await request(path, {
            method: 'POST',
            headers: body instanceof ArrayBuffer
              ? { 'content-type': 'application/octet-stream' }
              : { 'content-type': 'application/json' },
            body: body instanceof ArrayBuffer ? body : JSON.stringify(body),
          })
          settleSave(ticket, (prev) => ({ ...prev, status: 'ready', snapshot, busy: false, avatarError: '', avatarSize: 0 }))
          return snapshot
        } catch (error) {
          const code = error instanceof Error ? error.message : ''
          settleSave(ticket, (prev) => ({
            ...prev,
            busy: false,
            avatarError: code === 'too-large' || code === 'invalid-type' ? code : prev.avatarError,
            error: code === 'too-large' || code === 'invalid-type' ? '' : code,
            status: code === 'too-large' || code === 'invalid-type' ? prev.status : 'error',
          }))
          return undefined
        }
      }

      if (state.status === 'error' && !state.snapshot) {
        return h('div', { className: 'dsh-orb-set' },
          h('p', { className: 'dsh-orb-set-error', role: 'alert' }, `${text.error} ${state.error}`),
          h('button', { type: 'button', className: 'dsh-orb-set-button', onClick: () => { void load() } }, text.retry))
      }
      if (!state.snapshot) return h('div', { className: 'dsh-orb-set' }, h('p', null, text.nav))

      const snap = state.snapshot
      const disabled = !snap.supported || state.busy
      // A local check knows the file's size, so say it: "2.6 MB, over the 4 MB limit" is a
      // sentence; "too large" is a puzzle. Only a host-side 413 arrives without a size.
      const avatarMessage = state.avatarError === 'too-large'
        ? (state.avatarSize > 0 ? text.tooLargeSize : text.tooLarge)
          .replaceAll('{size}', megabytes(state.avatarSize))
          .replaceAll('{limit}', AVATAR_MAX_MB)
        : state.avatarError === 'invalid-type'
          ? text.invalidType
          : state.avatarError === 'unreadable'
            ? text.unreadable
            : ''
      return h('div', { className: 'dsh-orb-set' },
        h('h2', { className: 'dsh-orb-set-title' }, text.nav),
        h('p', { className: 'dsh-orb-set-intro' }, text.intro),
        state.status === 'error' && state.error
          ? h('p', { className: 'dsh-orb-set-error', role: 'alert' }, `${text.saveError} ${state.error}`)
          : null,
        snap.supported ? null : h('p', { className: 'dsh-orb-set-banner', role: 'status' }, text.linux),
        helperNotice(text, snap, disabled, mutate),
        snap.permissionFallback === true
          ? h('p', { className: 'dsh-orb-set-banner', role: 'status' }, text.permissionFallback)
          : null,
        // Outside the fieldset: an update is worth offering even where the ball itself is off.
        updateCard(text, snap, mutate),
        h('fieldset', { className: 'dsh-orb-set-fields', disabled },
          card(text.ball, text.ballDescription, h(Toggle, {
            checked: snap.ballEnabled === true,
            label: text.ball,
            disabled,
            onChange: (enabled) => { void mutate('/.dsh-orb/ball', { enabled }) },
          })),
          h('section', { className: 'dsh-orb-set-card' },
            h('h3', null, text.avatarTitle),
            h('p', null, text.avatarDescription.replaceAll('{limit}', AVATAR_MAX_MB)),
            h('div', { className: 'dsh-orb-set-avatar-row' },
              h('img', { className: 'dsh-orb-set-avatar', src: snap.avatarUrl, alt: text.avatarAlt }),
              h('div', { className: 'dsh-orb-set-actions' },
                h('button', {
                  type: 'button',
                  className: 'dsh-orb-set-button',
                  disabled,
                  onClick: () => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/gif,image/png,image/webp,.gif,.png,.webp'
                    input.onchange = () => {
                      const file = input.files && input.files[0]
                      if (!file) return
                      if (file.size > AVATAR_MAX_BYTES) {
                        setState((prev) => ({ ...prev, avatarError: 'too-large', avatarSize: file.size }))
                        return
                      }
                      // A failed read used to vanish into the void: no request, no message,
                      // nothing on the ball. Say so instead.
                      void file.arrayBuffer().then(
                        (bytes) => mutate('/.dsh-orb/avatar', bytes),
                        () => { setState((prev) => ({ ...prev, avatarError: 'unreadable', avatarSize: 0 })) },
                      )
                    }
                    input.click()
                  },
                }, text.chooseImage),
                h('button', {
                  type: 'button',
                  className: 'dsh-orb-set-button dsh-orb-set-ghost',
                  disabled,
                  onClick: () => { void mutate('/.dsh-orb/avatar/restore', {}) },
                }, text.restoreDefault))),
            avatarMessage ? h('p', { className: 'dsh-orb-set-error', role: 'alert' }, avatarMessage) : null,
            presetGallery(text, snap, disabled, mutate)),
          card(text.overlayTitle, text.overlayDescription, h(ModelPicker, {
            label: text.overlayTitle,
            catalog: state.catalog,
            current: snap.overlay,
            disabled,
            onSelect: (selection) => { void mutate('/.dsh-orb/overlay-model', selection) },
          })),
          card(text.backgroundTitle, text.backgroundDescription, h(ModelPicker, {
            label: text.backgroundTitle,
            catalog: state.catalog,
            current: snap.background,
            disabled,
            onSelect: (selection) => { void mutate('/.dsh-orb/background-model', selection) },
          })),
          card(text.millifractionTitle, text.millifractionDescription, h(Toggle, {
            checked: snap.millifractionEnabled === true,
            label: text.millifractionToggle,
            disabled,
            onChange: (enabled) => {
              if (enabled === snap.millifractionEnabled) return
              if (!window.confirm(text.millifractionConfirm)) return
              void mutate('/.dsh-orb/millifraction', { enabled })
            },
          })),
          card(text.frameTitle, text.frameDescription, h(Toggle, {
            checked: snap.observationFrameEnabled !== false,
            label: text.frameToggle,
            disabled,
            onChange: (enabled) => {
              if (enabled === snap.observationFrameEnabled) return
              void mutate('/.dsh-orb/observation-frame', { enabled })
            },
          })),
          snap.tcc && snap.tcc.applicable ? tccCard(text, snap, disabled, mutate) : null,
          h(VoiceCard, { text, snap, disabled, mutate })),
        h(WorkspaceCard, { text, snap, refreshSettings }),
        h(HistoryCard, { text, snap, mutate, refreshHistory }))
    }

    /**
     * Why the ball is not on screen yet: preparing (first-launch runtime), or failed with an
     * action that starts the work over. Nothing shows while a ball is up or the ball is off.
     *
     * The notice is deliberately loud. A quiet grey line in this page is what users walked past:
     * the failure colour follows a title and a filled button, and the waiting tone keeps its
     * own action so an interrupted first download can be restarted without leaving the page.
     */
    function helperNotice(text, snap, disabled, mutate) {
      if (snap.ballEnabled === false) return null
      const retryBall = () => {
        // POST the toggle's own value: the host restarts the helper and grants
        // a fresh download budget.
        void mutate('/.dsh-orb/ball', { enabled: true })
      }
      const redownload = () => {
        // Cancels the attempt in flight, clears what an interrupted one left behind, and
        // downloads again — no app restart, no waiting out a backoff.
        void mutate('/.dsh-orb/runtime/redownload', {})
      }
      if (snap.helperError === 'helper-exited') {
        return runtimeNotice(text.helperFailedTitle, text.helperFailed, 'error', text.retry, disabled, retryBall)
      }
      if (snap.helperError === 'runtime-download') {
        return runtimeNotice(text.runtimeFailedTitle, text.runtimeFailed, 'error', text.redownload, disabled, redownload)
      }
      if (typeof snap.helperPhase === 'string' && snap.helperPhase !== '') {
        return runtimeNotice(text.runtimePreparingTitle, text.runtimePreparing, 'wait', text.redownload, disabled, redownload)
      }
      return null
    }

    /**
     * One runtime notice: tone mark, title, body, and a filled action button on the same row.
     * The button is the point of the block, so it is a primary button, not the ghost one this
     * page used to render underneath the sentence.
     */
    function runtimeNotice(title, body, tone, action, disabled, onClick) {
      return h('section', {
        className: `dsh-orb-set-notice is-${tone}`,
        role: tone === 'error' ? 'alert' : 'status',
      },
        h('span', { className: 'dsh-orb-set-notice-mark', 'aria-hidden': 'true' }, tone === 'error' ? '!' : null),
        h('div', { className: 'dsh-orb-set-notice-main' },
          h('h3', { className: 'dsh-orb-set-notice-title' }, title),
          h('p', { className: 'dsh-orb-set-notice-body' }, body)),
        h('button', { type: 'button', className: 'dsh-orb-set-notice-action', disabled, onClick }, action))
    }

    /** Current version, the newest published one, and the one-click upgrade. */
    function updateCard(text, snap, mutate) {
      const update = snap.update
      // No version means an unknown install layout (a source checkout): stay out of the way.
      if (!update || !update.currentVersion) return null
      const installed = update.installedVersion || update.currentVersion
      const control = update.available
        ? h('button', {
          type: 'button',
          className: 'dsh-orb-set-button',
          disabled: update.updating,
          onClick: () => { void mutate('/.dsh-orb/update/install', {}) },
        }, update.updating ? text.updating.replaceAll('{version}', update.latestVersion || installed) : text.updateNow)
        : h('button', {
          type: 'button',
          className: 'dsh-orb-set-button dsh-orb-set-ghost',
          disabled: update.checking,
          onClick: () => { void mutate('/.dsh-orb/update/check', {}) },
        }, update.checking ? text.updateChecking : text.updateCheck)
      const allowBuilds = update.error === 'build-blocked' && Array.isArray(update.pendingBuilds) && update.pendingBuilds.length > 0
        ? h('button', {
          type: 'button',
          className: 'dsh-orb-set-button',
          onClick: () => { void mutate('/.dsh-orb/update/install', { approvedBuilds: update.pendingBuilds }) },
        }, text.updateAllowBuilds)
        : null
      return h('section', { className: 'dsh-orb-set-card' },
        h('h3', null, text.updateTitle),
        updateNotice(text, snap, update),
        allowBuilds,
        h('div', { className: 'dsh-orb-set-row' },
          h('div', null, h('p', null, text.updateCurrent.replaceAll('{version}', installed))),
          control),
        update.canUpdate ? null : h('p', { className: 'dsh-orb-set-banner', role: 'status' }, text.updateManual),
        h('div', { className: 'dsh-orb-set-row' },
          h('div', null, h('p', null, text.updateAutoDescription)),
          h(Toggle, {
            checked: update.autoCheck === true,
            label: text.updateAuto,
            disabled: false,
            onChange: (enabled) => { void mutate('/.dsh-orb/update/auto', { enabled }) },
          })))
    }

    function updateNotice(text, snap, update) {
      if (update.updating) {
        return h('p', { className: 'dsh-orb-set-banner', role: 'status' }, text.updating.replaceAll('{version}', update.latestVersion || update.installedVersion))
      }
      if (update.error) {
        const detail = update.error === 'network'
          ? text.updateOffline
          : update.error === 'build-blocked'
            ? text.updateBuildBlocked
            : update.error === 'already-installed'
              ? text.updateAlreadyInstalled
              : update.error
        return h('p', { className: 'dsh-orb-set-error', role: 'alert' }, `${text.updateFailed}${detail}`)
      }
      if (update.installing) {
        const app = snap.tcc && snap.tcc.appName ? snap.tcc.appName : 'DeepSeek Harness'
        return h('p', { className: 'dsh-orb-set-banner', role: 'status' }, text.updateInstalling
          .replaceAll('{name}', app))
      }
      if (update.deferred) {
        const app = snap.tcc && snap.tcc.appName ? snap.tcc.appName : 'DeepSeek Harness'
        return h('p', { className: 'dsh-orb-set-banner', role: 'status' }, text.updateDeferred
          .replaceAll('{version}', update.latestVersion || '')
          .replaceAll('{name}', app))
      }
      if (update.restartRequired) {
        const app = snap.tcc && snap.tcc.appName ? snap.tcc.appName : 'DeepSeek Harness'
        return h('p', { className: 'dsh-orb-set-banner', role: 'status' }, text.updateDone
          .replaceAll('{version}', update.installedVersion)
          .replaceAll('{name}', app))
      }
      if (update.available) {
        return h('p', { className: 'dsh-orb-set-banner', role: 'status' }, text.updateAvailable
          .replaceAll('{version}', update.latestVersion))
      }
      return null
    }

    /**
     * The Agent workspace is the cwd new floating-ball sessions are created in. Switching
     * never moves the old directory: only the pointer in this profile changes.
     */
    function WorkspaceCard({ text, snap, refreshSettings }) {
      const workspace = snap.workspace
      const [busy, setBusy] = React.useState(false)
      const [picking, setPicking] = React.useState(false)
      const [error, setError] = React.useState('')
      const [notice, setNotice] = React.useState('')
      const [dialog, setDialog] = React.useState(null)
      if (!workspace || !workspace.path) return null

      function workspaceError(code) {
        if (code === 'workspace-running') return text.workspaceRunning
        if (code === 'workspace-not-empty') return text.workspaceNotEmpty
        if (code === 'workspace-not-found') return text.workspaceNotFound
        if (code === 'workspace-not-directory') return text.workspaceNotDirectory
        if (code === 'workspace-not-readable') return text.workspaceNotReadable
        if (code === 'workspace-create-failed') return text.workspaceCreateFailed
        if (code === 'workspace-invalid-path' || code === 'workspace-not-absolute') return text.workspaceInvalidPath
        if (code === 'workspace-unavailable') return text.workspaceUnavailable
        return code || text.workspaceCreateFailed
      }

      async function pickDirectory() {
        if (busy || picking || dialog) return
        setPicking(true)
        setError('')
        setNotice('')
        try {
          const response = await request('/.dsh-orb/workspace/pick', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
          })
          const picked = response && typeof response.path === 'string' ? response.path : ''
          if (picked !== '' && picked !== workspace.path) setDialog({ path: picked, restore: false })
        } catch (cause) {
          const code = cause instanceof Error ? cause.message : String(cause)
          setError(code === 'workspace-picker-unavailable' ? text.workspacePickerUnavailable : text.workspacePickFailed)
        } finally {
          setPicking(false)
        }
      }

      function beginDefault() {
        setError('')
        setNotice('')
        setDialog({ path: workspace.defaultPath, restore: true })
      }

      function cancelDialog() {
        if (busy) return
        setDialog(null)
        setError('')
      }

      async function applyDialog() {
        if (!dialog || busy) return
        setBusy(true)
        setError('')
        try {
          await request('/.dsh-orb/workspace', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ path: dialog.path }),
          })
          setDialog(null)
          setNotice(text.workspaceChanged)
          await refreshSettings()
        } catch (cause) {
          const code = cause instanceof Error ? cause.message : String(cause)
          setDialog((prev) => prev ? { ...prev, error: workspaceError(code) } : prev)
        } finally {
          setBusy(false)
        }
      }

      function workspaceDialog() {
        if (!dialog) return null
        return h('div', {
          className: 'dsh-orb-set-dialog-backdrop',
          onClick: (event) => { if (event.target === event.currentTarget && !busy) cancelDialog() },
        },
          h('div', {
            className: 'dsh-orb-set-dialog',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': text.workspaceDialogTitle,
          },
            h('h3', null, text.workspaceDialogTitle),
            h('p', null, text.workspaceDialogBody
              .replaceAll('{old}', workspace.path)
              .replaceAll('{new}', dialog.path)),
            h('p', { className: 'dsh-orb-set-muted' }, text.workspaceDialogKeep),
            dialog.error ? h('p', { className: 'dsh-orb-set-error', role: 'alert' }, dialog.error) : null,
            h('div', { className: 'dsh-orb-set-dialog-actions' },
              h('button', {
                type: 'button',
                className: 'dsh-orb-set-button dsh-orb-set-ghost',
                autoFocus: true,
                disabled: busy,
                onClick: cancelDialog,
              }, text.workspaceDialogCancel),
              h('button', {
                type: 'button',
                className: 'dsh-orb-set-button dsh-orb-set-primary',
                disabled: busy,
                onClick: () => { void applyDialog() },
              }, busy ? text.workspaceChanging : text.workspaceDialogConfirm))))
      }

      return h('section', { className: 'dsh-orb-set-card' },
        h('h3', null, text.workspaceTitle),
        h('p', null, text.workspaceDescription),
        h('div', { className: 'dsh-orb-set-row' },
          h('p', { className: 'dsh-orb-set-muted dsh-orb-set-workspace-path' },
            `${text.workspaceCurrent}${workspace.path}${workspace.custom ? `（${text.workspaceCustom}）` : `（${text.workspaceDefault}）`}`),
          h('button', {
            type: 'button',
            className: 'dsh-orb-set-button dsh-orb-set-ghost',
            disabled: busy || picking || !workspace.custom,
            onClick: beginDefault,
          }, text.workspaceUseDefault)),
        h('div', { className: 'dsh-orb-set-row' },
          h('button', {
            type: 'button',
            className: 'dsh-orb-set-button dsh-orb-set-ghost dsh-orb-set-pick',
            title: text.workspacePick,
            'aria-label': text.workspacePick,
            disabled: busy || picking || dialog !== null,
            onClick: () => { void pickDirectory() },
          }, picking ? text.workspacePicking : text.workspacePick),
          h('button', {
            type: 'button',
            className: 'dsh-orb-set-path',
            title: text.workspacePick,
            disabled: busy || picking || dialog !== null,
            onClick: () => { void pickDirectory() },
          }, workspace.path)),
        error ? h('p', { className: 'dsh-orb-set-error', role: 'alert' }, error) : null,
        notice ? h('p', { className: 'dsh-orb-set-muted', role: 'status' }, notice) : null,
        workspaceDialog())
    }

    /** Retention choices shared with the Host's accepted values. */
    const HISTORY_RETENTION_DAYS = [0, 1, 7, 14, 30, 60]

    /**
     * Old floating-ball conversations. A select is the whole control: choosing a
     * finite window previews and confirms, then saves the policy and starts the
     * cleanup; choosing forever saves a zero policy and deletes nothing.
     */
    function HistoryCard({ text, snap, mutate, refreshHistory }) {
      const history = snap.history
      const current = history && HISTORY_RETENTION_DAYS.includes(history.retentionDays)
        ? String(history.retentionDays)
        : '0'
      const [choice, setChoice] = React.useState(current)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const [dialog, setDialog] = React.useState(null)
      const scanRef = React.useRef(0)
      const abortRef = React.useRef(null)
      React.useEffect(() => {
        if (!history || history.cleaning !== true) return undefined
        const timer = setInterval(() => { void refreshHistory() }, 2000)
        return () => { clearInterval(timer) }
      }, [history && history.cleaning])
      React.useEffect(() => () => {
        scanRef.current += 1
        abortRef.current?.abort()
      }, [])
      React.useEffect(() => {
        if (!dialog) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') {
            setDialog(null)
            setChoice(current)
          }
        }
        window.addEventListener('keydown', onKey)
        return () => { window.removeEventListener('keydown', onKey) }
      }, [dialog, current])
      if (!history) return null
      if (history.available === false) {
        return h('section', { className: 'dsh-orb-set-card' },
          h('h3', null, text.historyTitle),
          h('p', null, text.historyDescription),
          h('p', { className: 'dsh-orb-set-banner', role: 'status' }, text.historyUnavailable))
      }
      const cleaning = history.cleaning === true
      const pending = busy || cleaning || dialog !== null

      async function saveRetention(days) {
        await request('/.dsh-orb/history/retention', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ days }),
        })
      }

      async function scan(next) {
        scanRef.current += 1
        const token = scanRef.current
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        setDialog((prev) => prev && prev.next === next ? { ...prev, scanning: true, error: '', preview: null } : prev)
        try {
          const response = await request('/.dsh-orb/history/preview', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ days: next }),
            signal: controller.signal,
          })
          if (scanRef.current !== token) return
          if (!response || !response.preview) throw new Error(text.historyPreviewFailed)
          setDialog((prev) => prev && prev.next === next ? { ...prev, scanning: false, preview: response.preview } : prev)
        } catch (cause) {
          if (controller.signal.aborted || scanRef.current !== token) return
          setDialog((prev) => prev && prev.next === next
            ? { ...prev, scanning: false, error: cause instanceof Error ? cause.message : String(cause) }
            : prev)
        } finally {
          if (abortRef.current === controller) abortRef.current = null
        }
      }

      function choose(next) {
        if (pending) return
        if (next === history.retentionDays) {
          setChoice(current)
          return
        }
        setError('')
        setChoice(String(next))
        if (next === 0) {
          setDialog({ next: 0, preview: null, scanning: false, error: '' })
          return
        }
        setDialog({ next, preview: null, scanning: true, error: '' })
        void scan(next)
      }

      function cancelDialog() {
        scanRef.current += 1
        abortRef.current?.abort()
        abortRef.current = null
        setDialog(null)
        setChoice(current)
      }

      function retryScan() {
        if (!dialog || dialog.next === 0) return
        void scan(dialog.next)
      }

      async function applyDialog() {
        if (!dialog || dialog.scanning || dialog.error) return
        const next = dialog.next
        scanRef.current += 1
        abortRef.current?.abort()
        abortRef.current = null
        setDialog(null)
        setError('')
        setBusy(true)
        try {
          await saveRetention(next)
          if (next === 0) {
            await refreshHistory()
          } else {
            // The retention is already saved; the clean run now uses that new cutoff.
            await mutate('/.dsh-orb/history/clean', {})
          }
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
          setChoice(current)
        } finally {
          setBusy(false)
        }
      }

      function dialogList() {
        const preview = dialog && dialog.preview
        if (!preview || !Array.isArray(preview.sessions) || preview.sessions.length === 0) return null
        const shown = preview.sessions.slice(0, 10)
        const more = Math.max(0, (preview.roots ?? 0) - shown.length)
        return h('ul', { className: 'dsh-orb-set-dialog-list' },
          shown.map((session) => h('li', { key: session.id }, session.title || text.historyDialogUnnamed)),
          more > 0 ? h('li', { className: 'dsh-orb-set-muted' }, text.historyDialogMore.replaceAll('{count}', String(more))) : null)
      }

      function retentionDialog() {
        if (!dialog) return null
        const next = dialog.next
        const preview = dialog.preview
        const cancel = h('button', {
          type: 'button',
          className: 'dsh-orb-set-button dsh-orb-set-ghost',
          autoFocus: true,
          onClick: cancelDialog,
        }, text.historyDialogCancel)
        const confirm = h('button', {
          type: 'button',
          className: 'dsh-orb-set-button dsh-orb-set-primary',
          disabled: dialog.scanning || dialog.error !== '',
          onClick: () => { void applyDialog() },
        }, text.historyDialogConfirm)
        const retry = h('button', {
          type: 'button',
          className: 'dsh-orb-set-button dsh-orb-set-primary',
          onClick: retryScan,
        }, text.historyDialogRetry)
        let body
        if (dialog.scanning) {
          body = h('div', null,
            h('p', null, text.historyDialogScanning.replaceAll('{days}', String(next))),
            h('div', { className: 'dsh-orb-set-dialog-progress', role: 'progressbar', 'aria-label': text.historyDialogScanning.replaceAll('{days}', String(next)) },
              h('div', { className: 'dsh-orb-set-dialog-progress-fill' })))
        } else if (dialog.error) {
          body = h('p', { className: 'dsh-orb-set-error', role: 'alert' }, `${text.historyFailed}${dialog.error}`)
        } else if (next === 0) {
          body = h('p', null, text.historyDialogForever)
        } else {
          body = h('div', null,
            h('p', null, preview && preview.roots > 0
              ? text.historyDialogDelete.replaceAll('{count}', String(preview.roots))
              : text.historyDialogNoDelete.replaceAll('{days}', String(next))),
            h('p', { className: 'dsh-orb-set-muted' }, text.historyDialogKeep.replaceAll('{days}', String(next))),
            dialogList())
        }
        return h('div', {
          className: 'dsh-orb-set-dialog-backdrop',
          onClick: (event) => { if (event.target === event.currentTarget) cancelDialog() },
        },
          h('div', {
            className: 'dsh-orb-set-dialog',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': text.historyDialogTitle,
          },
            h('h3', null, text.historyDialogTitle),
            body,
            h('div', { className: 'dsh-orb-set-dialog-actions' },
              cancel,
              dialog.error ? retry : confirm)))
      }

      return h('section', { className: 'dsh-orb-set-card' },
        h('h3', null, text.historyTitle),
        h('p', null, text.historyDescription),
        h('div', { className: 'dsh-orb-set-row' },
          h('label', { className: 'dsh-orb-set-label' },
            h('span', null, text.historyRetention),
            h('select', {
              className: 'dsh-orb-set-select',
              'aria-label': text.historyRetention,
              value: choice,
              disabled: pending,
              onChange: (event) => { void choose(Number(event.target.value)) },
            },
              HISTORY_RETENTION_DAYS.map((days) => h('option', { key: days, value: String(days) },
                days === 0 ? text.historyForever : text.historyDaysOption.replaceAll('{days}', String(days))))))),
        h('p', { className: 'dsh-orb-set-muted' }, text.historyWorkspace.replaceAll('{path}', String(history.workspacePath || ''))),
        h('p', { className: 'dsh-orb-set-muted' }, text.historyRestoreHint),
        error ? h('p', { className: 'dsh-orb-set-error', role: 'alert' }, error) : null,
        cleaning ? h('p', { className: 'dsh-orb-set-banner', role: 'status' }, history.phase === 'restoring' ? text.historyRestoring : text.historyCleaning) : null,
        history.error ? h('p', { className: 'dsh-orb-set-error', role: 'alert' }, `${text.historyFailed}${history.error}`) : null,
        history.warning === 'images-kept'
          ? h('p', { className: 'dsh-orb-set-muted' }, text.historyWarning.replaceAll('{count}', String(history.warningSessions || 0)))
          : null,
        history.lastCleanupAt ? h('p', { className: 'dsh-orb-set-muted' }, text.historyLast.replaceAll('{sessions}', String(history.lastDeletedSessions))) : null,
        retentionDialog())
    }

    // Official sources and sizes. The host snapshot overrides these when it sends them.
    // Keep the URLs aligned with packages/voice/src/manifest.ts.
    const VOICE_OFFERS = {
      wake: {
        sources: ['https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/sherpa-onnx-kws-zipformer-zh-en-3M-2025-12-20.tar.bz2'],
        bytes: 38 * 1024 * 1024,
      },
      tts: {
        sources: [
          'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/matcha-icefall-zh-baker.tar.bz2',
          'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/matcha-icefall-en_US-ljspeech.tar.bz2',
          'https://github.com/k2-fsa/sherpa-onnx/releases/download/vocoder-models/vocos-22khz-univ.onnx',
        ],
        bytes: 214 * 1024 * 1024,
      },
      asr: {
        sources: ['https://huggingface.co', 'https://hf-mirror.com'],
        bytes: 239233841 + 315894 + 1807522,
      },
    }

    const VOICE_DEFAULTS = {
      wakeEnabled: true,
      wakeWords: ['你好大肥鱼'],
      wakeThreshold: 0.25,
      wakeScore: 1,
      wakeChunk: 8,
      wakeCooldownMs: 1500,
      wakeReply: '我在',
      commandEnabled: true,
      interjectKeyword: '大肥鱼',
      dismissPhrases: ['你退下吧', '退下吧'],
      dismissReply: '好的，再见',
      ttsEnabled: true,
      ttsBackend: 'local',
      qwenApiKey: '',
      qwenVoice: 'Cherry',
      qwenSpeed: 1.4,
      questionPrompt: '我有几个问题，你来选一下',
      ttsSpeed: 1.5,
      ttsVolume: 1,
      idleMs: 30000,
    }

    function normalizeVoice(raw) {
      const item = raw && typeof raw === 'object' ? raw : {}
      return {
        wakeEnabled: typeof item.wakeEnabled === 'boolean' ? item.wakeEnabled : VOICE_DEFAULTS.wakeEnabled,
        wakeWords: Array.isArray(item.wakeWords) ? item.wakeWords : VOICE_DEFAULTS.wakeWords,
        wakeThreshold: typeof item.wakeThreshold === 'number' ? item.wakeThreshold : VOICE_DEFAULTS.wakeThreshold,
        wakeScore: typeof item.wakeScore === 'number' ? item.wakeScore : VOICE_DEFAULTS.wakeScore,
        wakeChunk: item.wakeChunk === 16 ? 16 : 8,
        wakeCooldownMs: typeof item.wakeCooldownMs === 'number' ? item.wakeCooldownMs : VOICE_DEFAULTS.wakeCooldownMs,
        wakeReply: typeof item.wakeReply === 'string' ? item.wakeReply : VOICE_DEFAULTS.wakeReply,
        commandEnabled: typeof item.commandEnabled === 'boolean' ? item.commandEnabled : VOICE_DEFAULTS.commandEnabled,
        interjectKeyword: typeof item.interjectKeyword === 'string' ? item.interjectKeyword : VOICE_DEFAULTS.interjectKeyword,
        dismissPhrases: Array.isArray(item.dismissPhrases) ? item.dismissPhrases : VOICE_DEFAULTS.dismissPhrases,
        dismissReply: typeof item.dismissReply === 'string' ? item.dismissReply : VOICE_DEFAULTS.dismissReply,
        ttsEnabled: typeof item.ttsEnabled === 'boolean' ? item.ttsEnabled : VOICE_DEFAULTS.ttsEnabled,
        ttsBackend: item.ttsBackend === 'qwen' ? 'qwen' : 'local',
        qwenApiKey: typeof item.qwenApiKey === 'string' ? item.qwenApiKey : VOICE_DEFAULTS.qwenApiKey,
        qwenVoice: typeof item.qwenVoice === 'string' ? item.qwenVoice : VOICE_DEFAULTS.qwenVoice,
        qwenSpeed: typeof item.qwenSpeed === 'number' ? item.qwenSpeed : VOICE_DEFAULTS.qwenSpeed,
        questionPrompt: typeof item.questionPrompt === 'string' ? item.questionPrompt : VOICE_DEFAULTS.questionPrompt,
        ttsSpeed: typeof item.ttsSpeed === 'number' ? item.ttsSpeed : VOICE_DEFAULTS.ttsSpeed,
        ttsVolume: typeof item.ttsVolume === 'number' ? item.ttsVolume : VOICE_DEFAULTS.ttsVolume,
        idleMs: typeof item.idleMs === 'number' ? item.idleMs : VOICE_DEFAULTS.idleMs,
      }
    }

    function normalizeModel(raw, offer) {
      const item = raw && typeof raw === 'object' ? raw : {}
      const sources = Array.isArray(item.sources) ? item.sources.filter((entry) => typeof entry === 'string' && entry !== '') : []
      return {
        present: item.present === true,
        downloading: item.downloading === true,
        progress: typeof item.progress === 'number' ? item.progress : 0,
        sources: sources.length > 0 ? sources : offer.sources,
        bytes: typeof item.bytes === 'number' ? item.bytes : offer.bytes,
        error: typeof item.error === 'string' ? item.error : '',
        notice: item.notice === 'present' ? 'present' : '',
        official: item.official === false ? false : item.official === true ? true : undefined,
      }
    }

    function voiceLocks(control, models, backend) {
      const missing = []
      if ((control === 'wake' || control === 'wake-reply') && !models.wake.present) missing.push('wake')
      // Qwen does not use the local files: while it is selected those controls stay editable.
      if (backend !== 'qwen'
        && (control === 'wake-reply' || control === 'dismiss-reply' || control === 'tts')
        && !models.tts.present) missing.push('tts')
      if (control === 'command' && !models.asr.present) missing.push('asr')
      return missing
    }

    function splitLines(value) {
      return String(value).split(/\n/).map((line) => line.trim()).filter(Boolean)
    }

    /** Inline line icons for the voice panels: they inherit the surrounding colour and size. */
    function voiceIcon(name) {
      const paths = {
        voice: [
          'M12 3.5a2.7 2.7 0 0 1 2.7 2.7v5.3a2.7 2.7 0 0 1-5.4 0V6.2A2.7 2.7 0 0 1 12 3.5Z',
          'M6.5 11.1v.5a5.5 5.5 0 0 0 11 0v-.5',
          'M12 17.4v3.1',
          'M9.5 20.5h5',
        ],
        wake: [
          'M12 3.6a2.6 2.6 0 0 1 2.6 2.6v4.9a2.6 2.6 0 0 1-5.2 0V6.2A2.6 2.6 0 0 1 12 3.6Z',
          'M7 10.9v.5a5 5 0 0 0 10 0v-.5',
          'M12 16.4v2.1',
          'M9.9 19.7h4.2',
          'M19.2 4.2a8.7 8.7 0 0 1 0 9.3',
          'M21.4 2.4a11.6 11.6 0 0 1 0 12.9',
        ],
        command: [
          'M4.5 10.5v3',
          'M8.3 7.5v9',
          'M12 4.8v14.4',
          'M15.7 8.2v7.6',
          'M19.5 10.5v3',
        ],
        tts: [
          'M4 9.4h3.3L12 5.6v12.8L7.3 14.6H4Z',
          'M15.7 9.1a4.1 4.1 0 0 1 0 5.8',
          'M18.3 6.5a7.8 7.8 0 0 1 0 11',
        ],
        idle: [
          'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
          'M12 7.2v5l3.2 1.9',
        ],
        micOff: [
          'M4 4l16 16',
          'M9.4 5.1A2.6 2.6 0 0 1 14.6 7v3.7',
          'M17 9.4v2a5 5 0 0 1-1.3 3.4',
          'M7 10.9v.5a5 5 0 0 0 7.4 4.5',
          'M12 16.4v2.1',
          'M9.9 19.7h4.2',
        ],
      }
      const lines = paths[name] || paths.voice
      return h('svg', {
        viewBox: '0 0 24 24',
        width: 20,
        height: 20,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      }, lines.map((d, index) => h('path', { key: index, d })))
    }

    /**
     * Voice group on the floating-ball page. A missing model looks unavailable, but the
     * control still takes a click and explains which model to prepare. Native `disabled`
     * would swallow that click.
     *
     * The three columns are cards of their own: an icon and a switch in the header, the
     * adjustable values below. Every bounded value is a slider, so nobody has to type a
     * number whose unit and range they only learn from an error message.
     */
    function VoiceCard({ text, snap, disabled, mutate }) {
      const [dialog, setDialog] = React.useState(null)
      const draftRef = React.useRef({})
      const settledRef = React.useRef({})
      const [, bump] = React.useState(0)
      const voice = normalizeVoice(snap.voice)
      const models = {
        wake: normalizeModel(snap.voiceModels && snap.voiceModels.wake, VOICE_OFFERS.wake),
        tts: normalizeModel(snap.voiceModels && snap.voiceModels.tts, VOICE_OFFERS.tts),
        asr: normalizeModel(snap.voiceModels && snap.voiceModels.asr, VOICE_OFFERS.asr),
      }
      const missingText = {
        wake: text.modelMissingWake,
        tts: text.modelMissingTts,
        asr: text.modelMissingAsr,
      }

      function shown(key) {
        return Object.prototype.hasOwnProperty.call(draftRef.current, key) ? draftRef.current[key] : voice[key]
      }

      function remember(key, value) {
        draftRef.current = { ...draftRef.current, [key]: value }
        bump((count) => count + 1)
      }

      function save(patch) {
        const merged = { ...voice, ...draftRef.current, ...patch }
        if (typeof merged.wakeWords === 'string') merged.wakeWords = splitLines(merged.wakeWords)
        if (typeof merged.dismissPhrases === 'string') merged.dismissPhrases = splitLines(merged.dismissPhrases)
        void mutate('/.dsh-orb/voice', merged)
      }

      function openLock(missing) {
        setDialog({ type: 'locked', missing })
      }

      async function startDownload(kind) {
        if (models[kind].downloading) return
        setDialog(null)
        const snapshot = await mutate('/.dsh-orb/voice/download', { kind })
        if (snapshot && snapshot.voiceModels && snapshot.voiceModels[kind] && snapshot.voiceModels[kind].notice === 'present') {
          setDialog({ type: 'present' })
        }
      }

      function onDownload(kind) {
        if (disabled || models[kind].downloading) return
        if (kind === 'asr' && models.asr.official === false) {
          setDialog({ type: 'service' })
          return
        }
        if (!models[kind].present) {
          setDialog({ type: 'confirm', kind })
          return
        }
        void startDownload(kind)
      }

      function lockedProps(missing) {
        return {
          onMouseDown: (event) => {
            if (missing.length === 0) return
            event.preventDefault()
            openLock(missing)
          },
          onClick: () => {
            if (missing.length === 0) return
            openLock(missing)
          },
        }
      }

      /** Small values read better with their unit attached: 10 分钟, not 600. */
      function secondsLabel(value) {
        const total = Math.round(value)
        if (total < 60) return `${total} 秒`
        const minutes = Math.floor(total / 60)
        const rest = total % 60
        return rest === 0 ? `${minutes} 分钟` : `${minutes} 分 ${rest} 秒`
      }

      function fieldHead(label, valueText) {
        return h('span', { className: 'dsh-orb-set-voice-field-head' },
          h('span', { className: 'dsh-orb-set-voice-field-label' }, label),
          valueText === null ? null : h('span', { className: 'dsh-orb-set-voice-field-value' }, valueText))
      }

      /**
       * A stored value shown as a slider. `factor` converts display units to what the host
       * stores: 1000 for milliseconds, 0.01 for the volume fraction, 1 for the rest. A drag
       * previews live; release, arrow keys, and blur all write once.
       */
      function rangeField(label, key, missing, spec, wide) {
        const stepText = String(spec.step)
        const dot = stepText.indexOf('.')
        const stepDecimals = dot === -1 ? 0 : stepText.length - dot - 1
        const factor = spec.factor ?? 1
        const raw = Number(shown(key))
        const stored = Number.isFinite(raw) ? raw : (spec.fallback ?? spec.min * factor)
        let display = stored / factor
        if (!Number.isFinite(display)) display = spec.min
        display = Math.min(spec.max, Math.max(spec.min, Number(display.toFixed(stepDecimals))))
        const percent = spec.max === spec.min ? 0 : ((display - spec.min) / (spec.max - spec.min)) * 100
        const shownValue = spec.format(display)
        const storedFrom = (next) => {
          const stepped = Math.round((next - spec.min) / spec.step) * spec.step + spec.min
          return Number((stepped * factor).toFixed(spec.decimals ?? 2))
        }
        const commit = (event) => {
          if (missing.length) return
          let next = display
          if (event && event.target && event.target.value !== undefined && event.target.value !== '') {
            const parsed = Number(event.target.value)
            if (Number.isFinite(parsed)) next = parsed
          }
          next = Math.min(spec.max, Math.max(spec.min, next))
          const nextStored = storedFrom(next)
          // A release already saved this value; the blur that follows it must not save twice.
          if (settledRef.current[key] === nextStored) return
          settledRef.current[key] = nextStored
          remember(key, nextStored)
          save({})
        }
        return h('label', { className: `dsh-orb-set-voice-field${wide ? ' is-wide' : ''}` },
          fieldHead(label, shownValue),
          h('input', {
            type: 'range',
            className: `dsh-orb-set-voice-field-range${missing.length ? ' is-locked' : ''}`,
            'aria-label': label,
            'aria-valuetext': shownValue,
            'aria-disabled': missing.length ? 'true' : 'false',
            min: spec.min,
            max: spec.max,
            step: spec.step,
            value: String(display),
            style: { '--dsh-orb-voice-fill': `${Math.max(0, Math.min(100, percent))}%` },
            onChange: (event) => {
              if (missing.length) return
              const next = Number(event.target.value)
              if (!Number.isFinite(next)) return
              delete settledRef.current[key]
              remember(key, storedFrom(next))
            },
            onPointerUp: commit,
            onKeyUp: (event) => {
              if (!event) return
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home'
                || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') commit(event)
            },
            onBlur: commit,
            ...lockedProps(missing),
          }),
          h('span', { className: 'dsh-orb-set-voice-field-scale' },
            h('span', null, spec.format(spec.min)),
            h('span', null, spec.format(spec.max))),
          spec.hint ? h('span', { className: 'dsh-orb-set-voice-field-hint' }, spec.hint) : null)
      }

      function textInput(label, key, missing, hint, options) {
        const value = shown(key)
        const secret = options && options.secret === true
        return h('label', { className: 'dsh-orb-set-voice-field is-wide' },
          h('span', { className: 'dsh-orb-set-voice-field-label' }, label),
          h('input', {
            className: `dsh-orb-set-voice-input${missing.length ? ' is-locked' : ''}`,
            type: secret ? 'password' : 'text',
            autoComplete: 'off',
            spellCheck: false,
            'aria-label': label,
            'aria-disabled': missing.length ? 'true' : 'false',
            value: String(value ?? ''),
            onChange: (event) => {
              if (missing.length) return
              remember(key, event.target.value)
            },
            onBlur: (event) => {
              if (missing.length) return
              remember(key, event.target.value)
              save({})
            },
            ...lockedProps(missing),
          }),
          hint ? h('span', { className: 'dsh-orb-set-voice-field-hint' }, hint) : null)
      }

      function linesInput(label, key, missing, hint) {
        const value = shown(key)
        return h('label', { className: 'dsh-orb-set-voice-field is-wide' },
          h('span', { className: 'dsh-orb-set-voice-field-label' }, label),
          h('textarea', {
            className: `dsh-orb-set-voice-input dsh-orb-set-voice-textarea${missing.length ? ' is-locked' : ''}`,
            'aria-label': label,
            'aria-disabled': missing.length ? 'true' : 'false',
            rows: 2,
            value: Array.isArray(value) ? value.join('\n') : String(value ?? ''),
            onChange: (event) => {
              if (missing.length) return
              remember(key, event.target.value)
            },
            onBlur: (event) => {
              if (missing.length) return
              remember(key, splitLines(event.target.value))
              save({})
            },
            ...lockedProps(missing),
          }),
          hint ? h('span', { className: 'dsh-orb-set-voice-field-hint' }, hint) : null)
      }

      /** Two or three fixed choices read as buttons, not as another form control to decipher. */
      function segmentedField(label, options, current, missing, pick, hint, wide) {
        return h('div', { className: `dsh-orb-set-voice-field${wide ? ' is-wide' : ''}` },
          h('span', { className: 'dsh-orb-set-voice-field-label' }, label),
          h('div', {
            className: 'dsh-orb-set-voice-seg',
            role: 'radiogroup',
            'aria-label': label,
            'aria-disabled': missing.length ? 'true' : 'false',
          }, options.map((option) => h('button', {
            key: String(option.value),
            type: 'button',
            role: 'radio',
            className: `dsh-orb-set-voice-seg-item${option.value === current ? ' is-active' : ''}${missing.length ? ' is-locked' : ''}`,
            'aria-checked': option.value === current ? 'true' : 'false',
            'aria-disabled': missing.length ? 'true' : 'false',
            onMouseDown: (event) => {
              if (missing.length === 0) return
              event.preventDefault()
              openLock(missing)
            },
            onClick: () => {
              if (missing.length) {
                openLock(missing)
                return
              }
              pick(option.value)
            },
          }, option.label))),
          hint ? h('span', { className: 'dsh-orb-set-voice-field-hint' }, hint) : null)
      }

      /** The host owns the 48 names; the page only groups and formats them. */
      function qwenVoiceField() {
        const listed = Array.isArray(snap.qwenVoices)
          ? snap.qwenVoices.filter((item) => item && typeof item.voice === 'string')
          : []
        const current = String(shown('qwenVoice') ?? 'Cherry')
        const voices = listed.length > 0
          ? listed
          : [{ voice: current, label: current, group: 'standard' }]
        const groups = [
          { id: 'standard', label: text.qwenVoiceStandard },
          { id: 'dialect', label: text.qwenVoiceDialect },
        ]
        const options = groups.flatMap((group) => {
          const items = voices.filter((item) => (item.group === 'dialect' ? 'dialect' : 'standard') === group.id)
          if (items.length === 0) return []
          return [h('optgroup', { key: group.id, label: group.label },
            items.map((item) => h('option', { key: item.voice, value: item.voice }, item.label || item.voice)))]
        })
        return h('label', { className: 'dsh-orb-set-voice-field is-wide' },
          h('span', { className: 'dsh-orb-set-voice-field-label' }, text.qwenVoice),
          h('span', { className: 'dsh-orb-set-voice-select' },
            h('select', {
              className: 'dsh-orb-set-voice-input',
              'aria-label': text.qwenVoice,
              value: current,
              onChange: (event) => {
                const next = event.target.value
                remember('qwenVoice', next)
                save({ qwenVoice: next })
              },
            }, options)))
      }

      const sizeText = (bytes) => text.voiceSize.replaceAll('{size}', String(Math.round(bytes / (1024 * 1024))))

      function modelFooter(kind, label) {
        const model = models[kind]
        const percent = Math.max(0, Math.min(100, Math.round(model.progress * 100)))
        const name = kind === 'wake'
          ? text.voiceWakeModel
          : kind === 'asr'
            ? text.voiceAsrModel
            : backend === 'qwen'
              ? text.voiceTtsLocalModel
              : text.voiceTtsModel
        const optional = kind === 'tts' && backend === 'qwen' && !model.present && !model.downloading
        const state = model.downloading
          ? text.voiceModelDownloading
          : optional
            ? text.voiceModelOptional
            : model.present
              ? text.voiceModelReady
              : text.voiceModelMissing.replaceAll('{size}', sizeText(model.bytes))
        const action = kind === 'asr' && model.present
          ? null
          : h('button', {
            type: 'button',
            className: `dsh-orb-set-button dsh-orb-set-voice-action${model.present || optional ? ' dsh-orb-set-ghost' : ' dsh-orb-set-primary'}`,
            onClick: () => onDownload(kind),
          }, model.present ? text.voiceRedownload : label)
        return h('div', { className: 'dsh-orb-set-voice-model-block' },
          h('div', { className: 'dsh-orb-set-voice-model' },
            h('div', { className: 'dsh-orb-set-voice-model-info' },
              h('span', {
                className: `dsh-orb-set-voice-model-dot${model.present ? ' is-ready' : ''}${model.downloading ? ' is-active' : ''}`,
                'aria-hidden': 'true',
              }),
              h('div', { className: 'dsh-orb-set-voice-model-text' },
                h('span', { className: 'dsh-orb-set-voice-model-name' }, name),
                h('span', { className: 'dsh-orb-set-voice-model-state' }, state))),
            action),
          model.downloading ? h('div', {
            className: 'dsh-orb-set-voice-progress',
            role: 'progressbar',
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': percent,
            'aria-label': label,
          },
            h('div', { className: 'dsh-orb-set-voice-progress-track' },
              h('span', { style: { width: `${percent}%` } })),
            h('p', { className: 'dsh-orb-set-voice-progress-text' }, text.voiceProgress.replaceAll('{percent}', String(percent)))) : null,
          model.error ? h('p', { className: 'dsh-orb-set-error', role: 'alert' }, model.error) : null)
      }

      function voicePanel(icon, title, description, control, body, footer) {
        return h('section', { className: 'dsh-orb-set-voice-panel' },
          h('header', { className: 'dsh-orb-set-voice-panel-head' },
            h('span', { className: 'dsh-orb-set-voice-panel-icon', 'aria-hidden': 'true' }, voiceIcon(icon)),
            h('div', { className: 'dsh-orb-set-voice-panel-heading' },
              h('h4', null, title),
              h('p', null, description)),
            control),
          h('div', { className: 'dsh-orb-set-voice-panel-body' }, body),
          footer)
      }

      function panelSwitch(label, checked, missing, onChange) {
        return h('div', { className: 'dsh-orb-set-voice-panel-switch' },
          h('span', { className: 'dsh-orb-set-voice-panel-state' }, checked ? text.voiceOn : text.voiceOff),
          h(Toggle, {
            checked,
            label,
            disabled,
            locked: missing.length > 0,
            onLocked: () => openLock(missing),
            onChange,
          }))
      }

      const backend = shown('ttsBackend') === 'qwen' ? 'qwen' : 'local'
      const wakeLocks = voiceLocks('wake', models, backend)
      const wakeReplyLocks = voiceLocks('wake-reply', models, backend)
      const commandLocks = voiceLocks('command', models, backend)
      const dismissReplyLocks = voiceLocks('dismiss-reply', models, backend)
      const ttsLocks = voiceLocks('tts', models, backend)
      const currentChunk = Number(shown('wakeChunk')) === 16 ? 16 : 8

      const dialogNode = dialog === null ? null : h('div', { className: 'dsh-orb-set-dialog-backdrop' },
        h('div', { className: 'dsh-orb-set-dialog', role: 'dialog' },
          dialog.type === 'locked' ? [
            h('h3', { key: 'title' }, text.voiceTitle),
            ...dialog.missing.map((code) => h('p', { key: code }, missingText[code])),
            h('div', { key: 'actions', className: 'dsh-orb-set-dialog-actions' },
              h('button', { type: 'button', className: 'dsh-orb-set-button dsh-orb-set-primary', onClick: () => setDialog(null) }, text.voiceClose)),
          ] : null,
          dialog.type === 'present' ? [
            h('h3', { key: 'title' }, text.voiceTitle),
            h('p', { key: 'body' }, text.modelPresent),
            h('div', { key: 'actions', className: 'dsh-orb-set-dialog-actions' },
              h('button', { type: 'button', className: 'dsh-orb-set-button dsh-orb-set-primary', onClick: () => setDialog(null) }, text.voiceClose)),
          ] : null,
          dialog.type === 'service' ? [
            h('h3', { key: 'title' }, text.downloadAsr),
            h('p', { key: 'body' }, text.asrService),
            h('div', { key: 'actions', className: 'dsh-orb-set-dialog-actions' },
              h('button', { type: 'button', className: 'dsh-orb-set-button dsh-orb-set-primary', onClick: () => setDialog(null) }, text.voiceClose)),
          ] : null,
          dialog.type === 'confirm' ? [
            h('h3', { key: 'title' }, dialog.kind === 'wake' ? text.downloadWake : dialog.kind === 'tts' ? text.downloadTts : text.downloadAsr),
            h('p', { key: 'source-label' }, text.voiceSource),
            ...models[dialog.kind].sources.map((source) => h('p', { key: source }, source)),
            h('p', { key: 'size' }, sizeText(models[dialog.kind].bytes)),
            h('div', { key: 'actions', className: 'dsh-orb-set-dialog-actions' },
              h('button', { type: 'button', className: 'dsh-orb-set-button dsh-orb-set-ghost', onClick: () => setDialog(null) }, text.voiceCancel),
              h('button', { type: 'button', className: 'dsh-orb-set-button dsh-orb-set-primary', onClick: () => { void startDownload(dialog.kind) } }, text.voiceDownload)),
          ] : null))

      const wakePanel = voicePanel('wake', text.wakeTitle, text.wakeDesc,
        panelSwitch(text.wakeToggle, voice.wakeEnabled === true, wakeLocks, (enabled) => save({ wakeEnabled: enabled })),
        h('div', { className: 'dsh-orb-set-voice-fields' },
          rangeField(text.wakeThreshold, 'wakeThreshold', wakeLocks, {
            min: 0.05,
            max: 0.9,
            step: 0.01,
            fallback: 0.25,
            format: (value) => value.toFixed(2),
            hint: text.wakeThresholdHint,
          }),
          rangeField(text.wakeScore, 'wakeScore', wakeLocks, {
            min: 0.5,
            max: 4,
            step: 0.1,
            fallback: 1,
            format: (value) => value.toFixed(1),
            hint: text.wakeScoreHint,
          }),
          segmentedField(text.wakeChunk, [
            { value: 8, label: text.wakeChunk8 },
            { value: 16, label: text.wakeChunk16 },
          ], currentChunk, wakeLocks, (next) => {
            remember('wakeChunk', Number(next))
            save({ wakeChunk: Number(next) })
          }, text.wakeChunkHint),
          rangeField(text.wakeCooldown, 'wakeCooldownMs', wakeLocks, {
            min: 0.5,
            max: 5,
            step: 0.1,
            factor: 1000,
            decimals: 0,
            fallback: 1500,
            format: (value) => `${value.toFixed(1)} 秒`,
            hint: text.wakeCooldownHint,
          }),
          linesInput(text.wakeWords, 'wakeWords', wakeLocks, text.wakeWordsHint),
          textInput(text.wakeReply, 'wakeReply', wakeReplyLocks, null)),
        modelFooter('wake', text.downloadWake))

      const commandPanel = voicePanel('command', text.commandTitle, text.commandDesc,
        panelSwitch(text.commandToggle, voice.commandEnabled === true, commandLocks, (enabled) => save({ commandEnabled: enabled })),
        h('div', { className: 'dsh-orb-set-voice-fields' },
          textInput(text.interjectKeyword, 'interjectKeyword', commandLocks, text.interjectHint),
          linesInput(text.dismissPhrases, 'dismissPhrases', commandLocks, text.dismissHint),
          textInput(text.dismissReply, 'dismissReply', dismissReplyLocks, null)),
        modelFooter('asr', text.downloadAsr))

      const ttsPanel = voicePanel('tts', text.ttsTitle, text.ttsDesc,
        panelSwitch(text.ttsToggle, voice.ttsEnabled === true, ttsLocks, (enabled) => save({ ttsEnabled: enabled })),
        h('div', { className: 'dsh-orb-set-voice-fields' },
          segmentedField(text.ttsBackend, [
            { value: 'local', label: text.ttsBackendLocal },
            { value: 'qwen', label: text.ttsBackendQwen },
          ], backend, [], (next) => {
            remember('ttsBackend', next)
            save({ ttsBackend: next })
          }, null, true),
          rangeField(text.ttsVolume, 'ttsVolume', ttsLocks, {
            min: 0,
            max: 200,
            step: 1,
            factor: 0.01,
            decimals: 2,
            fallback: 1,
            format: (value) => `${Math.round(value)}%`,
            hint: text.ttsVolumeHint,
          }),
          backend === 'qwen'
            ? rangeField(text.qwenSpeed, 'qwenSpeed', [], {
              min: 0.5,
              max: 2,
              step: 0.1,
              fallback: 1.4,
              format: (value) => `${value.toFixed(1)}×`,
              hint: text.qwenSpeedHint,
            })
            : rangeField(text.ttsSpeed, 'ttsSpeed', ttsLocks, {
              min: 1,
              max: 3,
              step: 0.1,
              fallback: 1.5,
              format: (value) => `${value.toFixed(1)}×`,
              hint: text.ttsSpeedHint,
            }),
          textInput(text.questionPrompt, 'questionPrompt', ttsLocks, text.questionPromptHint),
          backend === 'qwen'
            ? textInput(text.qwenApiKey, 'qwenApiKey', [], String(shown('qwenApiKey') ?? '').trim() === '' ? text.qwenApiKeyHint : null, { secret: true })
            : null,
          backend === 'qwen' ? qwenVoiceField() : null),
        modelFooter('tts', text.downloadTts))

      const idlePanel = voicePanel('idle', text.idleTitle, text.idleDesc, null,
        h('div', { className: 'dsh-orb-set-voice-fields' },
          rangeField(text.idleSeconds, 'idleMs', [], {
            min: 5,
            max: 600,
            step: 1,
            factor: 1000,
            decimals: 0,
            fallback: 30000,
            format: secondsLabel,
            hint: text.idleHint,
          }, true)))

      return h('section', { className: 'dsh-orb-set-card dsh-orb-set-voice' },
        h('div', { className: 'dsh-orb-set-voice-head' },
          h('span', { className: 'dsh-orb-set-voice-head-icon', 'aria-hidden': 'true' }, voiceIcon('voice')),
          h('div', { className: 'dsh-orb-set-voice-head-text' },
            h('h3', null, text.voiceTitle),
            h('p', null, text.voiceIntro))),
        snap.voiceMic === false ? h('div', { className: 'dsh-orb-set-voice-mic' },
          h('span', { className: 'dsh-orb-set-voice-mic-icon', 'aria-hidden': 'true' }, voiceIcon('micOff')),
          h('p', { className: 'dsh-orb-set-voice-mic-text' }, text.voiceMicBody),
          h('button', {
            type: 'button',
            className: 'dsh-orb-set-button dsh-orb-set-voice-action',
            onClick: () => { void mutate('/.dsh-orb/voice/mic', {}) },
          }, text.voiceMicOpen)) : null,
        wakePanel,
        commandPanel,
        ttsPanel,
        idlePanel,
        dialogNode)
    }

    function card(title, description, control) {
      return h('section', { className: 'dsh-orb-set-card dsh-orb-set-row' },
        h('div', null, h('h3', null, title), h('p', null, description)),
        control)
    }

    /**
     * The shipped GIFs as clickable animated thumbnails, with the outbound link to the
     * community gallery trailing the row. The host owns the preset list, this page the
     * names; the gallery link is this page's own, so an older host that sends no presets
     * still gets it.
     */
    function presetGallery(text, snap, disabled, mutate) {
      const presets = Array.isArray(snap.avatarPresets) ? snap.avatarPresets : []
      const names = text.avatarPresetNames || {}
      const tiles = presets.map((preset) => {
        const name = names[preset.id] || preset.id
        const selected = snap.avatarPresetId === preset.id
        return h('button', {
          key: preset.id,
          type: 'button',
          className: `dsh-orb-set-preset${selected ? ' is-selected' : ''}`,
          'aria-pressed': selected ? 'true' : 'false',
          title: name,
          disabled,
          onClick: () => { void mutate('/.dsh-orb/avatar/preset', { preset: preset.id }) },
        },
          h('img', { src: preset.url, alt: '', draggable: false }),
          h('span', null, name))
      })
      // A text link taking the row's leftover space, not a seventh tile: it is no avatar, so
      // the row keeps exactly the built-ins. An anchor rather than a button, so the shell
      // hands the https open to the system browser — and so browsing the gallery stays
      // available while the ball is off or a save is in flight, where fieldset disabled-ness
      // cannot reach it. Kept to the label alone (no arrow, no padding): the leftover after
      // six 72px tiles is about 62px in a half-width window, and a wider link would wrap onto
      // a line of its own instead of sitting in that space. With no presets it sits flush left.
      tiles.push(h('a', {
        key: 'more',
        className: `dsh-orb-set-more${presets.length === 0 ? ' is-alone' : ''}`,
        href: AVATAR_GALLERY_URL,
        target: '_blank',
        rel: 'noopener noreferrer',
        title: text.avatarMoreHint,
      }, text.avatarMore))
      return h('div', { className: 'dsh-orb-set-presets' },
        presets.length === 0
          ? null
          : h('p', { className: 'dsh-orb-set-presets-title', id: 'dsh-orb-presets-label' }, text.avatarBuiltin),
        h('div', {
          className: 'dsh-orb-set-presets-row',
          role: 'group',
          ...(presets.length === 0
            ? { 'aria-label': text.avatarMore }
            : { 'aria-labelledby': 'dsh-orb-presets-label' }),
        }, ...tiles))
    }

    function tccCard(text, snap, disabled, mutate) {
      const name = snap.tcc.appName || ''
      return h('section', { className: 'dsh-orb-set-card' },
        h('h3', null, text.tccTitle),
        h('p', null, text.tccDescription),
        h('p', null, text.tccAppHint.replaceAll('{name}', name)),
        tccRow(text.tccScreenName, text.tccScreenReason, text.tccScreenPath, statusText(text, snap.tcc.screen), text.tccScreenOpen, disabled || snap.tcc.screen === 'granted', () => {
          void mutate('/.dsh-orb/tcc', { right: 'screen' })
        }),
        tccRow(text.tccAccessibilityName, text.tccAccessibilityReason, text.tccAccessibilityPath, statusText(text, snap.tcc.accessibility), text.tccAccessibilityOpen, disabled || snap.tcc.accessibility === 'granted', () => {
          void mutate('/.dsh-orb/tcc', { right: 'accessibility' })
        }),
        h('p', null, text.tccFooter.replaceAll('{name}', name)))
    }

    function tccRow(name, reason, path, status, open, disabled, onClick) {
      return h('div', { className: 'dsh-orb-set-tcc' },
        h('div', null,
          h('h4', null, name),
          h('p', null, reason),
          h('p', null, path),
          h('p', { className: 'dsh-orb-set-status' }, status)),
        h('button', { type: 'button', className: 'dsh-orb-set-button', disabled, onClick }, open))
    }

    const style = `
.dsh-orb-set { display: flex; flex-direction: column; gap: 16px; max-width: 720px; color: inherit; }
.dsh-orb-set-title { margin: 0; font-size: 20px; }
.dsh-orb-set-intro, .dsh-orb-set p { margin: 4px 0 0; color: color-mix(in srgb, currentColor 72%, transparent); font-size: 13px; line-height: 1.45; }
.dsh-orb-set-banner { color: inherit; }
.dsh-orb-set-error { color: var(--dsw-alias-state-error-primary, #d92d20); }
/* Every error line on this page is a <p>, and the rule above ("class + type") outranks the bare
   class, so the failure colour has to be spelled with the paragraph in the selector. */
.dsh-orb-set p.dsh-orb-set-error { color: var(--dsw-alias-state-error-primary, #d92d20); }
.dsh-orb-set-notice { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-radius: 12px; border: 1px solid transparent; }
.dsh-orb-set-notice.is-error { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #d92d20) 45%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #d92d20) 10%, transparent); }
.dsh-orb-set-notice.is-wait { border-color: color-mix(in srgb, var(--dsw-alias-button-info-fill, #2f6fed) 40%, transparent); background: color-mix(in srgb, var(--dsw-alias-button-info-fill, #2f6fed) 9%, transparent); }
.dsh-orb-set-notice-mark { flex: none; width: 22px; height: 22px; margin-top: -1px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; line-height: 1; }
.dsh-orb-set-notice.is-error .dsh-orb-set-notice-mark { background: var(--dsw-alias-state-error-primary, #d92d20); color: var(--dsw-static-neutral-bluish-00, #fff); }
.dsh-orb-set-notice.is-wait .dsh-orb-set-notice-mark { border: 2px solid color-mix(in srgb, var(--dsw-alias-button-info-fill, #2f6fed) 30%, transparent); border-top-color: var(--dsw-alias-button-info-fill, #2f6fed); animation: dsh-orb-set-spin 0.9s linear infinite; }
@keyframes dsh-orb-set-spin { to { transform: rotate(360deg); } }
.dsh-orb-set-notice-main { flex: 1; min-width: 0; }
.dsh-orb-set .dsh-orb-set-notice-title { margin: 0; font-size: 14px; font-weight: 600; color: inherit; }
.dsh-orb-set-notice.is-error .dsh-orb-set-notice-title { color: var(--dsw-alias-state-error-primary, #d92d20); }
.dsh-orb-set p.dsh-orb-set-notice-body { margin: 4px 0 0; font-size: 13px; line-height: 1.45; color: inherit; }
.dsh-orb-set .dsh-orb-set-notice-action { flex: none; margin-left: auto; align-self: center; border: 0; border-radius: 8px; padding: 9px 16px; font: inherit; font-weight: 600; white-space: nowrap; cursor: pointer; background: var(--dsw-alias-button-info-fill, #2f6fed); color: var(--dsw-static-neutral-bluish-00, #fff); }
.dsh-orb-set .dsh-orb-set-notice-action:hover:enabled { filter: brightness(1.08); }
.dsh-orb-set .dsh-orb-set-notice-action:disabled { opacity: 0.5; cursor: default; }
.dsh-orb-set-fields { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.dsh-orb-set-card { border: 1px solid color-mix(in srgb, currentColor 16%, transparent); border-radius: 12px; padding: 14px 16px; }
.dsh-orb-set-row, .dsh-orb-set-avatar-row, .dsh-orb-set-tcc { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.dsh-orb-set h3, .dsh-orb-set h4 { margin: 0; font-size: 14px; }
.dsh-orb-set-avatar { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; background: color-mix(in srgb, currentColor 8%, transparent); }
.dsh-orb-set-presets { margin-top: 10px; }
.dsh-orb-set-presets-title { margin: 0; font-size: 12px; }
.dsh-orb-set-presets-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.dsh-orb-set-preset { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 72px; padding: 5px 2px; border: 1px solid transparent; border-radius: 10px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.dsh-orb-set-preset img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; background: color-mix(in srgb, currentColor 8%, transparent); }
.dsh-orb-set-preset span { font-size: 11px; line-height: 1.2; }
.dsh-orb-set-preset:hover { border-color: color-mix(in srgb, currentColor 20%, transparent); }
.dsh-orb-set-preset.is-selected { border-color: var(--dsw-alias-button-info-fill, #2f6fed); }
.dsh-orb-set-more { margin-left: auto; align-self: center; color: var(--dsw-alias-button-info-fill, #2f6fed); font-size: 12px; line-height: 1.2; text-decoration: none; white-space: nowrap; }
.dsh-orb-set-more.is-alone { margin-left: 0; }
.dsh-orb-set-more:hover { text-decoration: underline; }
.dsh-orb-set-actions, .dsh-orb-set-pickers { display: flex; gap: 8px; align-items: center; }
.dsh-orb-set-button, .dsh-orb-set select { border: 1px solid color-mix(in srgb, currentColor 20%, transparent); background: transparent; color: inherit; border-radius: 8px; padding: 6px 10px; font: inherit; }
.dsh-orb-set-ghost { border-color: transparent; }
.dsh-orb-set-switch { width: 40px; height: 24px; border-radius: 999px; border: 0; background: color-mix(in srgb, currentColor 18%, transparent); position: relative; flex: none; }
.dsh-orb-set-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--dsw-static-neutral-bluish-00, white); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); transition: transform 120ms ease; }
.dsh-orb-set-switch.is-on { background: var(--dsw-alias-button-info-fill, #2f6fed); }
.dsh-orb-set-switch.is-on::after { transform: translateX(16px); }
.dsh-orb-set-tcc { margin-top: 12px; }
.dsh-orb-set-status { font-weight: 600; }
.dsh-orb-set-fields:disabled { opacity: 0.55; }
.dsh-orb-set-label { display: flex; align-items: center; gap: 12px; font-weight: 600; }
.dsh-orb-set-select { min-width: 190px; }
.dsh-orb-set-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: start; cursor: pointer; border: 1px solid color-mix(in srgb, currentColor 20%, transparent); background: transparent; color: inherit; border-radius: 8px; padding: 6px 8px; font: inherit; }
.dsh-orb-set-path:disabled { opacity: 0.55; cursor: default; }
.dsh-orb-set-pick { flex: none; white-space: nowrap; }
.dsh-orb-set-workspace-path { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.dsh-orb-set-dialog-backdrop { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.32)); }
.dsh-orb-set-dialog { width: min(460px, 100%); max-height: min(70vh, 560px); overflow: auto; padding: 20px; border-radius: 12px; background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-3, #fff)); box-shadow: 0 18px 60px var(--dsw-alias-bg-mask-3, rgba(0, 0, 0, 0.28)); }
.dsh-orb-set-dialog h3 { margin: 0 0 10px; }
.dsh-orb-set-dialog p { margin: 8px 0; overflow-wrap: anywhere; }
.dsh-orb-set-dialog-list { margin: 12px 0 0; padding-left: 20px; max-height: 200px; overflow: auto; }
.dsh-orb-set-dialog-list li { margin: 4px 0; overflow-wrap: anywhere; }
.dsh-orb-set-dialog-progress { height: 4px; margin: 16px 0 4px; border-radius: 999px; background: color-mix(in srgb, currentColor 12%, transparent); overflow: hidden; }
.dsh-orb-set-dialog-progress-fill { width: 34%; height: 100%; border-radius: inherit; background: var(--dsw-alias-button-info-fill, #2f6fed); animation: dsh-orb-set-progress 1.1s ease-in-out infinite; }
@keyframes dsh-orb-set-progress { from { transform: translateX(-110%); } to { transform: translateX(320%); } }
.dsh-orb-set-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.dsh-orb-set-primary { background: var(--dsw-alias-button-info-fill, #2f6fed); color: var(--dsw-static-neutral-bluish-00, white); border-color: transparent; }
.dsh-orb-set-muted { color: color-mix(in srgb, currentColor 58%, transparent); }
/* Voice: three switchable panels, sliders for every bounded value. */
.dsh-orb-set-voice { padding: 16px 16px 18px; }
.dsh-orb-set-voice-head { display: flex; align-items: flex-start; gap: 12px; }
.dsh-orb-set-voice-head-icon { flex: none; width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--dsw-alias-button-info-fill, #2f6fed); background: color-mix(in srgb, var(--dsw-alias-button-info-fill, #2f6fed) 12%, transparent); }
.dsh-orb-set-voice-head-text { flex: 1; min-width: 0; }
.dsh-orb-set .dsh-orb-set-voice-head-text h3 { font-size: 15px; }
.dsh-orb-set .dsh-orb-set-voice-head-text p { margin-top: 3px; font-size: 12.5px; line-height: 1.45; color: color-mix(in srgb, currentColor 62%, transparent); }
.dsh-orb-set-voice-panel { margin-top: 12px; padding: 14px 15px 15px; border: 1px solid color-mix(in srgb, currentColor 8%, transparent); border-radius: 13px; background: color-mix(in srgb, currentColor 2.6%, transparent); }
.dsh-orb-set-voice-panel-head { display: flex; align-items: center; gap: 11px; }
.dsh-orb-set-voice-panel-icon { flex: none; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--dsw-alias-button-info-fill, #2f6fed); background: color-mix(in srgb, var(--dsw-alias-button-info-fill, #2f6fed) 11%, transparent); }
.dsh-orb-set-voice-panel-icon svg { width: 19px; height: 19px; }
.dsh-orb-set-voice-panel-heading { flex: 1; min-width: 0; }
.dsh-orb-set .dsh-orb-set-voice-panel-heading h4 { font-size: 13.5px; font-weight: 600; }
.dsh-orb-set .dsh-orb-set-voice-panel-heading p { margin-top: 2px; font-size: 12px; line-height: 1.45; color: color-mix(in srgb, currentColor 58%, transparent); }
.dsh-orb-set-voice-panel-switch { flex: none; display: flex; align-items: center; gap: 8px; }
.dsh-orb-set-voice-panel-state { font-size: 11px; color: color-mix(in srgb, currentColor 55%, transparent); }
.dsh-orb-set-voice-panel-body { margin-top: 13px; }
.dsh-orb-set-voice-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px 20px; align-items: start; }
.dsh-orb-set-voice-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; font-size: 12px; }
.dsh-orb-set-voice-field.is-wide { grid-column: 1 / -1; }
.dsh-orb-set-voice-field-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.dsh-orb-set-voice-field-label { font-size: 12.5px; font-weight: 500; color: color-mix(in srgb, currentColor 84%, transparent); }
.dsh-orb-set-voice-field-value { flex: none; font-size: 11.5px; font-weight: 600; line-height: 1.4; padding: 1px 8px; border-radius: 999px; color: var(--dsw-alias-button-info-fill, #2f6fed); background: color-mix(in srgb, var(--dsw-alias-button-info-fill, #2f6fed) 10%, transparent); font-variant-numeric: tabular-nums; white-space: nowrap; }
.dsh-orb-set-voice-field-scale { display: flex; justify-content: space-between; gap: 8px; font-size: 10.5px; line-height: 1.2; color: color-mix(in srgb, currentColor 52%, transparent); font-variant-numeric: tabular-nums; }
.dsh-orb-set-voice-field-hint { font-size: 11px; line-height: 1.5; color: color-mix(in srgb, currentColor 56%, transparent); }
.dsh-orb-set-voice-field-range { -webkit-appearance: none; appearance: none; width: 100%; height: 20px; margin: 0; padding: 0; background: transparent; cursor: pointer; }
.dsh-orb-set-voice-field-range::-webkit-slider-runnable-track { height: 5px; border-radius: 999px; background: linear-gradient(90deg, var(--dsw-alias-button-info-fill, #2f6fed) 0 var(--dsh-orb-voice-fill, 0%), color-mix(in srgb, currentColor 13%, transparent) var(--dsh-orb-voice-fill, 0%) 100%); }
.dsh-orb-set-voice-field-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; margin-top: -5.5px; border-radius: 50%; border: 2px solid var(--dsw-alias-button-info-fill, #2f6fed); background: var(--dsw-alias-bg-overlay, #fff); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.22); transition: transform 120ms ease, box-shadow 120ms ease; }
.dsh-orb-set-voice-field-range:hover::-webkit-slider-thumb { transform: scale(1.08); }
.dsh-orb-set-voice-field-range:focus { outline: none; }
.dsh-orb-set-voice-field-range:focus-visible { outline: none; }
.dsh-orb-set-voice-field-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 4px color-mix(in srgb, var(--dsw-alias-button-info-fill, #2f6fed) 20%, transparent); }
.dsh-orb-set-voice-field-range::-moz-range-track { height: 5px; border-radius: 999px; background: color-mix(in srgb, currentColor 13%, transparent); }
.dsh-orb-set-voice-field-range::-moz-range-progress { height: 5px; border-radius: 999px; background: var(--dsw-alias-button-info-fill, #2f6fed); }
.dsh-orb-set-voice-field-range::-moz-range-thumb { width: 13px; height: 13px; border-radius: 50%; border: 2px solid var(--dsw-alias-button-info-fill, #2f6fed); background: var(--dsw-alias-bg-overlay, #fff); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.22); }
.dsh-orb-set-voice-input { box-sizing: border-box; width: 100%; min-width: 0; border: 1px solid color-mix(in srgb, currentColor 16%, transparent); border-radius: 9px; background: color-mix(in srgb, currentColor 2.5%, transparent); color: inherit; font: inherit; font-size: 12.5px; line-height: 1.45; padding: 7px 10px; transition: border-color 120ms ease, box-shadow 120ms ease; }
.dsh-orb-set-voice-input:focus { outline: none; border-color: var(--dsw-alias-button-info-fill, #2f6fed); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-button-info-fill, #2f6fed) 15%, transparent); }
.dsh-orb-set textarea.dsh-orb-set-voice-input { min-height: 56px; resize: vertical; }
.dsh-orb-set-voice-select { position: relative; display: block; }
.dsh-orb-set-voice-select::after { content: ''; position: absolute; right: 13px; top: 50%; width: 6px; height: 6px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: translateY(-70%) rotate(45deg); opacity: 0.5; pointer-events: none; }
.dsh-orb-set-voice-select select { appearance: none; -webkit-appearance: none; padding-right: 30px; }
.dsh-orb-set-voice-seg { display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: color-mix(in srgb, currentColor 6%, transparent); }
.dsh-orb-set-voice-seg-item { flex: 1; min-width: 0; border: 0; border-radius: 7px; background: transparent; color: color-mix(in srgb, currentColor 68%, transparent); font: inherit; font-size: 12px; font-weight: 500; padding: 6px 8px; cursor: pointer; white-space: nowrap; transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease; }
.dsh-orb-set-voice-seg-item:hover:not(.is-active) { background: color-mix(in srgb, currentColor 5%, transparent); color: inherit; }
.dsh-orb-set-voice-seg-item.is-active { background: var(--dsw-alias-button-info-fill, #2f6fed); color: var(--dsw-static-neutral-bluish-00, #fff); box-shadow: 0 1px 4px color-mix(in srgb, var(--dsw-alias-button-info-fill, #2f6fed) 35%, transparent); }
.dsh-orb-set-voice-model-block { margin-top: 14px; padding-top: 12px; border-top: 1px dashed color-mix(in srgb, currentColor 13%, transparent); }
.dsh-orb-set-voice-model { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.dsh-orb-set-voice-model-info { display: flex; align-items: center; gap: 9px; min-width: 0; }
.dsh-orb-set-voice-model-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: color-mix(in srgb, currentColor 28%, transparent); }
.dsh-orb-set-voice-model-dot.is-ready { background: #12b76a; box-shadow: 0 0 0 3px color-mix(in srgb, #12b76a 16%, transparent); }
.dsh-orb-set-voice-model-dot.is-active { background: var(--dsw-alias-button-info-fill, #2f6fed); animation: dsh-orb-set-voice-pulse 1.4s ease-in-out infinite; }
@keyframes dsh-orb-set-voice-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--dsw-alias-button-info-fill, #2f6fed) 32%, transparent); } 50% { box-shadow: 0 0 0 5px transparent; } }
.dsh-orb-set-voice-model-text { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; min-width: 0; }
.dsh-orb-set-voice-model-name { font-size: 12.5px; font-weight: 600; }
.dsh-orb-set-voice-model-state { font-size: 11.5px; color: color-mix(in srgb, currentColor 58%, transparent); }
.dsh-orb-set .dsh-orb-set-voice-action { flex: none; padding: 6px 11px; border-radius: 8px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.dsh-orb-set-voice-model .dsh-orb-set-ghost { border-color: color-mix(in srgb, currentColor 18%, transparent); color: color-mix(in srgb, currentColor 78%, transparent); }
.dsh-orb-set-voice-progress { margin-top: 10px; }
.dsh-orb-set-voice-progress-track { height: 5px; border-radius: 999px; background: color-mix(in srgb, currentColor 12%, transparent); overflow: hidden; }
.dsh-orb-set-voice-progress-track > span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, color-mix(in srgb, var(--dsw-alias-button-info-fill, #2f6fed) 65%, #fff), var(--dsw-alias-button-info-fill, #2f6fed)); transition: width 240ms ease; }
.dsh-orb-set .dsh-orb-set-voice-progress-text { margin: 5px 0 0; font-size: 11px; color: color-mix(in srgb, currentColor 55%, transparent); }
.dsh-orb-set-voice-mic { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 12px; border-radius: 11px; border: 1px solid color-mix(in srgb, #d97706 22%, transparent); background: color-mix(in srgb, #d97706 8%, transparent); }
.dsh-orb-set-voice-mic-icon { flex: none; display: flex; color: var(--dsw-alias-state-warning-primary, #b45309); }
.dsh-orb-set .dsh-orb-set-voice-mic-text { flex: 1; min-width: 0; margin: 0; font-size: 12px; line-height: 1.45; color: inherit; }
.dsh-orb-set .is-locked { opacity: 0.45; }
@media (max-width: 560px) {
  .dsh-orb-set-voice-panel-switch .dsh-orb-set-voice-panel-state { display: none; }
  .dsh-orb-set-voice-model { flex-wrap: wrap; }
}
`

    /** Settings-section id of this page; the ball's menu row asks the shell to show exactly this one. */
    const SECTION_ID = 'orb'

    const inject = ['slots']

    function apply(ctx) {
      // Rewrite the node, don't just skip when it exists: a hot reload keeps the previous
      // run's <style> in the document, and an early return would leave old rules applied
      // to markup that already expects the new ones.
      let styleNode = document.getElementById('dsh-orb-settings-style')
      if (!styleNode) {
        styleNode = document.createElement('style')
        styleNode.id = 'dsh-orb-settings-style'
        document.head.append(styleNode)
      }
      styleNode.textContent = style
      /**
       * Show the floating-ball section in the main window's settings modal, switching
       * away from whichever section is up. The shell owns modal visibility: its store
       * handle is the ledger currency of the `sidebar.settings` entry, and its create()
       * hands back the mounted instance, whose openSection also opens the modal. Reports
       * false when no shell can be reached yet, so the caller leaves the ball's request
       * armed and retries instead of dropping the click.
       */
      function showOrbSettings() {
        let entries
        let sections
        try {
          entries = ctx.slots.entries('sidebar.settings')
          sections = ctx.slots.entries('settings.section')
        } catch {
          return false
        }
        // openSection does not validate its id: opening one this page no longer occupies
        // would show the panel with no matching nav row and nothing in it.
        const ours = (sections ?? []).some((entry) => entry && entry.options && entry.options.id === SECTION_ID)
        if (!ours) return false
        for (const entry of entries ?? []) {
          // The handle rides the entry itself: SlotCore keeps only id/order/label/priority
          // inside `options`, and the mounted-store axis resolves `entry.store`.
          const handle = entry === undefined || entry === null
            ? undefined
            : entry.store ?? (entry.options === undefined ? undefined : entry.options.store)
          if (!handle || typeof handle !== 'object' || typeof handle.create !== 'function') continue
          let instance
          try {
            // A mounted shell returns the same instance every time; a bare store handle
            // would mint a fresh, invisible one per call — opening that helps nobody.
            instance = handle.create()
            if (instance !== handle.create()) continue
          } catch {
            continue
          }
          const openSection = instance && instance.actions ? instance.actions.openSection : undefined
          if (typeof openSection !== 'function') continue
          try {
            openSection(SECTION_ID)
          } catch {
            return false
          }
          return true
        }
        return false
      }
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: SECTION_ID,
        order: 25,
        label: () => copy().nav,
        inject: () => ({}),
      }, OrbSettingsSection))
      // Main-window bridge. The ball cannot reach this window, so it arms targets on the
      // host and this page consumes them. Bookmark jumps open a session through the
      // workspace navigator: a bare sessions.retain would stack a second mainView
      // reference while the current session keeps its own, and the main view would never
      // move. The settings row asks this page to show the floating-ball section the ball
      // belongs to. Both are confirmed with a POST via request() — mutate() lives inside
      // the settings component and is not in scope here.
      ctx.effect(() => {
        let openedKey = ''
        let openedSettingsAt = 0
        const poll = setInterval(() => { void consume(); void consumeSettings() }, 2000)
        async function consume() {
          let target
          try {
            target = await request('/.dsh-orb/jump')
          } catch {
            return
          }
          const sessionId = target && typeof target.sessionId === 'string' ? target.sessionId : ''
          if (sessionId === '') {
            openedKey = ''
            return
          }
          // The arm timestamp makes the key: reading the same armed target
          // twice means the earlier confirm failed — re-confirm only, never
          // re-open, or every poll would yank the main view back.
          const key = `${sessionId}:${typeof target.at === 'number' ? target.at : 0}`
          if (key !== openedKey) {
            let workspace
            try {
              workspace = ctx.get('uiWorkspace')
            } catch {
              workspace = undefined
            }
            if (workspace === undefined || typeof workspace.openSession !== 'function') return
            try {
              workspace.openSession(sessionId)
            } catch {
              // The session may not be listed yet; the target stays armed until it expires.
              return
            }
            openedKey = key
          }
          try {
            await request('/.dsh-orb/jump', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            })
          } catch {
            // Consuming is best-effort; the same-target guard above stops any yank loop.
          }
        }
        async function consumeSettings() {
          let target
          try {
            target = await request('/.dsh-orb/settings-open')
          } catch {
            return
          }
          const at = target && typeof target.at === 'number' ? target.at : 0
          if (at === 0) {
            openedSettingsAt = 0
            return
          }
          // Same guard as jumps, keyed on the arm timestamp: a confirm that got lost
          // re-confirms on the next poll instead of re-opening the panel.
          if (at !== openedSettingsAt) {
            if (!showOrbSettings()) {
              // The settings shell is not on the ledger yet (a cold launch composes
              // plugins after the first poll); the target stays armed and we retry.
              return
            }
            openedSettingsAt = at
          }
          try {
            await request('/.dsh-orb/settings-open', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ at }),
            })
          } catch {
            // Consuming is best-effort; the arm timestamp guard stops any reopen loop.
          }
        }
        return () => {
          clearInterval(poll)
        }
      }, 'dsh-orb: main-window bridge')
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})

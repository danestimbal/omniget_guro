; Inno Setup script for GuroHub Video Downloader.
; Packages the raw `cargo tauri build` output (exe + bundled resources) —
; this is an alternative to the NSIS/MSI installers Tauri's own bundler
; produces, for cases where an Inno Setup .exe is preferred.
;
; Build:
;   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\gurohub.iss
;
; By default it reads the build from src-tauri\target\release. Point it at
; a different target dir (e.g. when CARGO_TARGET_DIR was overridden) with:
;   ISCC.exe /DBuildDir="D:\gurohub-target\release" installer\gurohub.iss

#define MyAppName "GuroHub Video Downloader"
#define MyAppVersion "0.9.1"
#define MyAppPublisher "GuroHub"
#define MyAppExeName "omniget.exe"
#define MyAppURL "https://github.com/danestimbal/omniget_guro"
#ifndef BuildDir
  #define BuildDir "..\src-tauri\target\release"
#endif

[Setup]
AppId={{56D80175-D176-4EE2-AF03-768984A09A86}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
UninstallDisplayIcon={app}\{#MyAppExeName}
DisableProgramGroupPage=yes
OutputDir=Output
OutputBaseFilename=GuroHub-Setup-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
SetupIconFile=..\src-tauri\icons\icon.ico
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Files]
Source: "{#BuildDir}\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDir}\browser-extension\*"; DestDir: "{app}\browser-extension"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.zip"

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent

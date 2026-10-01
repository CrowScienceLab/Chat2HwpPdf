using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;

internal static class Setup
{
    const string HostName = "com.ai_chat_exporter.hwp";
    const string ModuleName = "FilePathCheckerModuleExample";
    static string ProductKey = @"Software\CrowScienceLab\Chat2HwpPdf";
    static string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\CrowChat2HwpPdf";
    static string ModulesKey = @"Software\HNC\HwpAutomation\Modules";
    static string BrowserPrefix = @"Software\";
    static string Root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrowScienceLab", "Chat2HwpPdf");
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
    static TextBox extension, output, module;
    static Label status;
    static bool FailInstallForTest;
    sealed class RegistrySnapshot {
        public string Path, Name; public object Value; public RegistryValueKind Kind;
    }

    [STAThread] static int Main(string[] args)
    {
        Application.EnableVisualStyles();
        if (args.Length == 1 && args[0] == "--self-test") return SelfTest();
        if (args.Length == 4 && args[0] == "--install") {
            try { Install(args[1], args[2], args[3]); return 0; }
            catch (Exception error) { Console.Error.WriteLine(error.Message); return 1; }
        }
        try {
            if (args.Length == 1 && args[0] == "--uninstall") {
                if (MessageBox.Show("수식Chat 도우미와 전용 보안 모듈·등록값·설정을 제거할까요?\n저장한 문서는 보존됩니다. Chrome 확장은 별도로 삭제해 주세요.", "수식Chat 제거", MessageBoxButtons.YesNo) != DialogResult.Yes) return 0;
                string temporary = Path.Combine(Path.GetTempPath(), "CrowChat2HwpPdf", Guid.NewGuid().ToString("N"));
                Directory.CreateDirectory(temporary);
                string worker = Path.Combine(temporary, "Uninstall.exe");
                File.Copy(Assembly.GetExecutingAssembly().Location, worker);
                Process.Start(new ProcessStartInfo(worker, "--remove-worker") { UseShellExecute = false });
                return 0;
            }
            if (args.Length == 1 && args[0] == "--remove-worker") {
                string self = Path.GetFullPath(Assembly.GetExecutingAssembly().Location);
                string prefix = Path.GetFullPath(Path.Combine(Path.GetTempPath(), "CrowChat2HwpPdf")) + Path.DirectorySeparatorChar;
                if (!self.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) throw new IOException("제거 실행 위치가 올바르지 않습니다.");
                try {
                    Remove();
                    MessageBox.Show("수식Chat 도우미를 제거했습니다. 저장한 문서는 그대로 보존했습니다.", "제거 완료");
                } finally { ScheduleCleanup(self); }
                return 0;
            }
            using (var form = new Form()) {
                form.Text = "수식Chat 도우미 " + ReleaseInfo.Version + " · Crow Science Lab.";
                using (var iconStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("App.ico")) form.Icon = new Icon(iconStream);
                form.ClientSize = new Size(620, 245); form.FormBorderStyle = FormBorderStyle.FixedDialog;
                form.MaximizeBox = false; form.StartPosition = FormStartPosition.CenterScreen;
                form.Font = new Font("맑은 고딕", 10); form.BackColor = Color.FromArgb(250, 250, 248);
                AddLabel(form, "수식Chat to HWPX/PDF", 24, 20, 565, 32).Font = new Font("맑은 고딕", 17, FontStyle.Bold);
                AddLabel(form, "Windows 한글 변환 도우미 · 보안 승인 모듈 통합 설치", 24, 59, 565, 27);
                AddLabel(form, "설치를 누르면 기본 설정으로 설치됩니다. Windows 데스크톱 한글이 필요합니다.", 24, 94, 565, 44);
                var advanced = new Panel { Left = 0, Top = 169, Width = 620, Height = 215, Visible = false };
                form.Controls.Add(advanced);
                extension = AddField(advanced, "Chrome 확장 ID", 0, DefaultExtension(), false);
                output = AddField(advanced, "HWPX 저장 폴더", 71, SavedOutput(), true);
                module = AddField(advanced, "보안 모듈 설치 폴더", 142, Path.Combine(Root, "Security"), true);
                using (var key = Registry.CurrentUser.OpenSubKey(ProductKey)) {
                    if (key != null && key.GetValue("ModulePath") is string) module.Text = Path.GetDirectoryName((string)key.GetValue("ModulePath"));
                }
                var toggle = new CheckBox { Text = "고급 설정", Left = 24, Top = 135, Width = 160, Height = 28 };
                form.Controls.Add(toggle);
                status = AddLabel(form, "현재 사용자에게 설치됩니다.", 24, 169, 565, 42);
                var install = new Button { Text = "설치", Left = 438, Top = 207, Width = 154, Height = 35 };
                toggle.CheckedChanged += (sender, e) => {
                    advanced.Visible = toggle.Checked;
                    if (toggle.Checked) advanced.SendToBack();
                    form.ClientSize = new Size(620, toggle.Checked ? 475 : 245);
                    status.Top = toggle.Checked ? 391 : 169;
                    install.Top = toggle.Checked ? 437 : 207;
                };
                install.Click += (sender, e) => {
                    install.Enabled = false;
                    try { Install(extension.Text.Trim(), output.Text.Trim(), module.Text.Trim()); status.Text = "설치 완료 · " + ReleaseInfo.Version + " · 확장 앱의 설치 안내 화면으로 돌아가세요."; }
                    catch (Exception error) { MessageBox.Show(error.Message, "설치 실패"); }
                    finally { install.Enabled = true; }
                };
                form.Controls.Add(install);
                if (args.Length == 2 && args[0] == "--preview-ui") {
                    string directory = Path.GetFullPath(args[1]);
                    Directory.CreateDirectory(directory);
                    form.ShowInTaskbar = false;
                    form.StartPosition = FormStartPosition.Manual;
                    form.Location = new Point(-32000, -32000);
                    form.Show(); Application.DoEvents();
                    using (var bitmap = new Bitmap(form.Width, form.Height)) { form.DrawToBitmap(bitmap, new Rectangle(0, 0, bitmap.Width, bitmap.Height)); bitmap.Save(Path.Combine(directory, "installer-default.png")); }
                    toggle.Checked = true;
                    Application.DoEvents();
                    using (var bitmap = new Bitmap(form.Width, form.Height)) { form.DrawToBitmap(bitmap, new Rectangle(0, 0, bitmap.Width, bitmap.Height)); bitmap.Save(Path.Combine(directory, "installer-advanced.png")); }
                    return 0;
                }
                Application.Run(form);
            }
            return 0;
        } catch (Exception error) {
            if (args.Length > 0 && args[0] == "--preview-ui") { Console.Error.WriteLine(error); return 1; }
            MessageBox.Show(error.Message, "수식Chat"); return 1;
        }
    }
    static Label AddLabel(Control form, string text, int x, int y, int w, int h) {
        var label = new Label { Text = text, Left = x, Top = y, Width = w, Height = h }; form.Controls.Add(label); return label;
    }
    static void ScheduleCleanup(string self) {
        // A hidden helper waits for this process, then deletes only its exact temporary files.
        string quotedFile = "'" + self.Replace("'", "''") + "'";
        string quotedDir = "'" + Path.GetDirectoryName(self).Replace("'", "''") + "'";
        string script = "Wait-Process -Id " + Process.GetCurrentProcess().Id + " -ErrorAction SilentlyContinue; Remove-Item -LiteralPath " + quotedFile + " -Force; Remove-Item -LiteralPath " + quotedDir;
        Process.Start(new ProcessStartInfo("powershell.exe", "-NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand " + Convert.ToBase64String(Encoding.Unicode.GetBytes(script))) { UseShellExecute = false, CreateNoWindow = true });
    }
    static TextBox AddField(Control form, string label, int y, string value, bool browse) {
        AddLabel(form, label, 24, y, 565, 24);
        var field = new TextBox { Left = 24, Top = y + 27, Width = browse ? 473 : 568, Text = value };
        form.Controls.Add(field);
        if (browse) {
            var button = new Button { Text = "찾아보기", Left = 505, Top = y + 25, Width = 87, Height = 29 };
            button.Click += (sender, e) => { using (var dialog = new FolderBrowserDialog()) { dialog.SelectedPath = field.Text; if (dialog.ShowDialog() == DialogResult.OK) field.Text = dialog.SelectedPath; } };
            form.Controls.Add(button);
        }
        return field;
    }
    static string DefaultExtension() {
        using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("ExtensionId.txt"))
        using (var reader = new StreamReader(stream)) return reader.ReadToEnd().Trim();
    }
    static string SavedOutput() {
        string settings = Path.Combine(Root, "settings.json");
        if (File.Exists(settings)) {
            var value = Json.Deserialize<Dictionary<string, string>>(File.ReadAllText(settings));
            if (value.ContainsKey("outputDirectory")) return value["outputDirectory"];
        }
        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Chat2Hwp&Pdf");
    }
    static void Extract(string resource, string target) {
        using (var input = Assembly.GetExecutingAssembly().GetManifestResourceStream(resource))
        using (var file = File.Create(target)) input.CopyTo(file);
    }
    static string Hash(string path) {
        using (var sha = SHA256.Create()) using (var stream = File.OpenRead(path)) return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "");
    }
    static void Install(string id, string outputPath, string moduleDirectory) {
        if (!Path.IsPathRooted(moduleDirectory)) throw new ArgumentException("보안 모듈의 절대 설치 경로가 필요합니다.");
        var files = new Dictionary<string, byte[]>(StringComparer.OrdinalIgnoreCase);
        foreach (string name in new[] { "AIChatExporter.HwpHost.exe", "Uninstall.exe", HostName + ".json", "settings.json" }) {
            string file = Path.Combine(Root, name); files[file] = File.Exists(file) ? File.ReadAllBytes(file) : null;
        }
        string moduleFile = Path.Combine(Path.GetFullPath(moduleDirectory), "FilePathCheckerModuleExample.dll");
        files[moduleFile] = File.Exists(moduleFile) ? File.ReadAllBytes(moduleFile) : null;
        var snapshots = new List<RegistrySnapshot>();
        var keys = new Dictionary<string, bool>();
        Action<string, string[]> capture = (keyPath, names) => {
            using (var key = Registry.CurrentUser.OpenSubKey(keyPath)) {
                keys[keyPath] = key != null;
                foreach (string name in names) {
                    object value = key == null ? null : key.GetValue(name);
                    snapshots.Add(new RegistrySnapshot { Path = keyPath, Name = name, Value = value, Kind = value == null ? RegistryValueKind.String : key.GetValueKind(name) });
                }
            }
        };
        foreach (string browser in new[] { @"Google\Chrome", @"Microsoft\Edge" }) capture(BrowserPrefix + browser + @"\NativeMessagingHosts\" + HostName, new[] { "" });
        capture(ModulesKey, new[] { ModuleName });
        capture(ProductKey, new[] { "ModulePath", "ModuleHash", "InstallRoot" });
        capture(UninstallKey, new[] { "DisplayName", "DisplayVersion", "Publisher", "InstallLocation", "UninstallString", "NoModify", "NoRepair", "DisplayIcon" });
        try { InstallCore(id, outputPath, moduleDirectory); }
        catch (Exception installError) {
            var recoveryErrors = new List<string>();
            foreach (var file in files) {
                try { if (file.Value == null) { if (File.Exists(file.Key)) File.Delete(file.Key); } else if (!File.Exists(file.Key) || !BytesEqual(File.ReadAllBytes(file.Key), file.Value)) File.WriteAllBytes(file.Key, file.Value); }
                catch (Exception error) { recoveryErrors.Add(error.Message); }
            }
            foreach (var value in snapshots) {
                try { using (var key = Registry.CurrentUser.CreateSubKey(value.Path)) { if (value.Value == null) key.DeleteValue(value.Name, false); else key.SetValue(value.Name, value.Value, value.Kind); } }
                catch (Exception error) { recoveryErrors.Add(error.Message); }
            }
            foreach (var keyPath in keys) if (!keyPath.Value) {
                try { bool empty; using (var key = Registry.CurrentUser.OpenSubKey(keyPath.Key)) empty = key != null && key.ValueCount == 0 && key.SubKeyCount == 0; if (empty) Registry.CurrentUser.DeleteSubKey(keyPath.Key, false); }
                catch (Exception error) { recoveryErrors.Add(error.Message); }
            }
            if (recoveryErrors.Count > 0) throw new IOException(installError.Message + "\n일부 이전 상태 복원 실패: " + String.Join("; ", recoveryErrors.ToArray()));
            throw;
        }
    }
    static bool BytesEqual(byte[] a, byte[] b) {
        if (a.Length != b.Length) return false;
        for (int i = 0; i < a.Length; i++) if (a[i] != b[i]) return false;
        return true;
    }
    static void InstallCore(string id, string outputPath, string moduleDirectory) {
        if (!Regex.IsMatch(id, "^[a-p]{32}$")) throw new ArgumentException("확장 설정 화면의 32자리 Chrome 확장 ID를 입력해 주세요.");
        if (!Path.IsPathRooted(outputPath) || !Path.IsPathRooted(moduleDirectory)) throw new ArgumentException("절대 경로의 폴더를 선택해 주세요.");
        if (Type.GetTypeFromProgID("HWPFrame.HwpObject") == null) throw new InvalidOperationException("Windows 데스크톱 한글이 설치되어 있지 않습니다.");
        outputPath = Path.GetFullPath(outputPath); moduleDirectory = Path.GetFullPath(moduleDirectory);
        string modulePath = Path.Combine(moduleDirectory, "FilePathCheckerModuleExample.dll");
        string previousModule = null;
        using (var key = Registry.CurrentUser.OpenSubKey(ProductKey)) { if (key != null) previousModule = key.GetValue("ModulePath") as string; }
        if (previousModule != null && !String.Equals(previousModule, modulePath, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("보안 모듈 위치를 바꾸려면 기존 도우미를 제거한 뒤 설치해 주세요.");
        using (var key = Registry.CurrentUser.OpenSubKey(ModulesKey)) {
            string registered = key == null ? null : key.GetValue(ModuleName) as string;
            if (registered != null && (previousModule == null || !String.Equals(registered, previousModule, StringComparison.OrdinalIgnoreCase)))
                throw new IOException("공식 이름의 보안 모듈이 다른 경로에 등록되어 있습니다. 기존 등록을 보존하므로 설치를 중단합니다: " + registered);
        }
        using (var key = Registry.CurrentUser.OpenSubKey(ModulesKey + @"\Uses"))
            if (previousModule == null && key != null && key.GetValue(ModuleName) != null)
                throw new IOException("공식 모듈의 기존 사용 설정이 있습니다. 기존 설정을 확인한 뒤 설치해 주세요.");
        if (File.Exists(modulePath) && previousModule == null) throw new IOException("선택한 폴더에 같은 이름의 파일이 있습니다. 다른 설치 폴더를 선택해 주세요.");
        Directory.CreateDirectory(Root); Directory.CreateDirectory(moduleDirectory); Directory.CreateDirectory(outputPath);
        Extract("Host.exe", Path.Combine(Root, "AIChatExporter.HwpHost.exe"));
        Extract("Security.dll", modulePath);
        string setupPath = Path.Combine(Root, "Uninstall.exe");
        if (!String.Equals(Assembly.GetExecutingAssembly().Location, setupPath, StringComparison.OrdinalIgnoreCase)) File.Copy(Assembly.GetExecutingAssembly().Location, setupPath, true);
        string manifestPath = Path.Combine(Root, HostName + ".json");
        File.WriteAllText(manifestPath, Json.Serialize(new { name = HostName, description = "수식Chat HWPX 도우미 — Crow Science Lab.", path = Path.Combine(Root, "AIChatExporter.HwpHost.exe"), type = "stdio", allowed_origins = new[] { "chrome-extension://" + id + "/" } }), new UTF8Encoding(false));
        File.WriteAllText(Path.Combine(Root, "settings.json"), Json.Serialize(new { outputDirectory = outputPath }), new UTF8Encoding(false));
        foreach (string browser in new[] { @"Google\Chrome", @"Microsoft\Edge" })
            using (var key = Registry.CurrentUser.CreateSubKey(BrowserPrefix + browser + @"\NativeMessagingHosts\" + HostName)) key.SetValue("", manifestPath);
        using (var key = Registry.CurrentUser.CreateSubKey(ModulesKey)) key.SetValue(ModuleName, modulePath);
        if (FailInstallForTest) throw new IOException("Simulated install failure");
        using (var key = Registry.CurrentUser.CreateSubKey(ProductKey)) { key.SetValue("ModulePath", modulePath); key.SetValue("ModuleHash", Hash(modulePath)); key.SetValue("InstallRoot", Root); }
        using (var key = Registry.CurrentUser.CreateSubKey(UninstallKey)) {
            key.SetValue("DisplayName", "수식Chat 도우미"); key.SetValue("DisplayVersion", ReleaseInfo.Version); key.SetValue("Publisher", "Crow Science Lab.");
            key.SetValue("DisplayIcon", setupPath + ",0"); key.SetValue("InstallLocation", Root); key.SetValue("UninstallString", "\"" + setupPath + "\" --uninstall"); key.SetValue("NoModify", 1); key.SetValue("NoRepair", 1);
        }
    }
    static void Remove() {
        string modulePath, moduleHash;
        using (var key = Registry.CurrentUser.OpenSubKey(ProductKey)) {
            if (key == null) return;
            if (!String.Equals(key.GetValue("InstallRoot") as string, Root, StringComparison.OrdinalIgnoreCase)) throw new IOException("설치 경로 기록이 일치하지 않습니다.");
            modulePath = key.GetValue("ModulePath") as string; moduleHash = key.GetValue("ModuleHash") as string;
        }
        // Never recurse into a chosen directory. Remove only our known DLL and files.
        var ownedFiles = new List<string>();
        if (modulePath != null) ownedFiles.Add(modulePath);
        foreach (string name in new[] { "AIChatExporter.HwpHost.exe", "Uninstall.exe", HostName + ".json", "settings.json" }) ownedFiles.Add(Path.Combine(Root, name));
        foreach (string file in ownedFiles) if (File.Exists(file)) {
            try { using (var probe = new FileStream(file, FileMode.Open, FileAccess.ReadWrite, FileShare.None)) { } }
            catch (Exception error) { throw new IOException("실행 중인 수식Chat 작업과 한글을 닫은 뒤 다시 제거해 주세요. 파일: " + Path.GetFileName(file), error); }
        }
        if (modulePath != null && File.Exists(modulePath)) {
            if (Path.GetFileName(modulePath) != "FilePathCheckerModuleExample.dll" || Hash(modulePath) != moduleHash) throw new IOException("보안 모듈이 설치 후 변경되었습니다. 파일을 확인한 뒤 제거해 주세요.");
            File.Delete(modulePath);
        }
        string manifestPath = Path.Combine(Root, HostName + ".json");
        foreach (string browser in new[] { @"Google\Chrome", @"Microsoft\Edge" }) {
            string subkey = BrowserPrefix + browser + @"\NativeMessagingHosts\" + HostName;
            using (var key = Registry.CurrentUser.OpenSubKey(subkey, true)) {
                if (key != null && String.Equals(key.GetValue("") as string, manifestPath, StringComparison.OrdinalIgnoreCase)) key.DeleteValue("", false);
            }
            using (var key = Registry.CurrentUser.OpenSubKey(subkey)) {
                if (key != null && (key.ValueCount != 0 || key.SubKeyCount != 0)) continue;
            }
            Registry.CurrentUser.DeleteSubKey(subkey, false);
        }
        bool ownsRegistration = false;
        using (var key = Registry.CurrentUser.OpenSubKey(ModulesKey, true))
            if (key != null && String.Equals(key.GetValue(ModuleName) as string, modulePath, StringComparison.OrdinalIgnoreCase)) { key.DeleteValue(ModuleName, false); ownsRegistration = true; }
        if (ownsRegistration) using (var key = Registry.CurrentUser.OpenSubKey(ModulesKey + @"\Uses", true))
            if (key != null) key.DeleteValue(ModuleName, false);
        foreach (string file in new[] { "AIChatExporter.HwpHost.exe", "Uninstall.exe", HostName + ".json", "settings.json" }) {
            string target = Path.Combine(Root, file); if (File.Exists(target)) File.Delete(target);
        }
        Registry.CurrentUser.DeleteSubKeyTree(ProductKey, false); Registry.CurrentUser.DeleteSubKeyTree(UninstallKey, false);
        if (modulePath != null && Directory.Exists(Path.GetDirectoryName(modulePath)) && Directory.GetFileSystemEntries(Path.GetDirectoryName(modulePath)).Length == 0 && Path.GetDirectoryName(modulePath).StartsWith(Root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) Directory.Delete(Path.GetDirectoryName(modulePath));
        if (Directory.Exists(Root) && Directory.GetFileSystemEntries(Root).Length == 0) Directory.Delete(Root);
    }
    static int SelfTest() {
        string project = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), "..", ".."));
        string testRoot = Path.Combine(project, "tmp", "installer-" + Guid.NewGuid().ToString("N"));
        string testKey = @"Software\CrowScienceLab\InstallerTests\" + Guid.NewGuid().ToString("N");
        Directory.CreateDirectory(testRoot);
        Root = Path.Combine(testRoot, "App"); ProductKey = testKey + @"\Product"; UninstallKey = testKey + @"\Uninstall";
        ModulesKey = testKey + @"\Modules"; BrowserPrefix = testKey + @"\Browsers\";
        string report = Path.Combine(testRoot, "result.txt");
        try {
            string docs = Path.Combine(testRoot, "Chat2Hwp&Pdf"); string security = Path.Combine(testRoot, "Security");
            Directory.CreateDirectory(docs); Directory.CreateDirectory(security);
            File.WriteAllText(Path.Combine(docs, "keep.hwpx"), "user document sentinel");
            File.WriteAllText(Path.Combine(security, "keep.txt"), "unrelated file sentinel");
            using (var key = Registry.CurrentUser.CreateSubKey(ModulesKey)) key.SetValue("OtherProduct", "preserve");
            using (var key = Registry.CurrentUser.CreateSubKey(ModulesKey)) key.SetValue(ModuleName, "OtherApplication.dll");
            try { Install(new string('a', 32), docs, security); throw new Exception("Existing official registration was overwritten"); }
            catch (IOException) { }
            using (var key = Registry.CurrentUser.OpenSubKey(ModulesKey, true)) {
                if ((string)key.GetValue(ModuleName) != "OtherApplication.dll") throw new Exception("Existing module registration lost");
                key.DeleteValue(ModuleName);
            }
            Install(new string('a', 32), docs, security);
            Install(new string('a', 32), docs, security); // repair/update path
            using (var key = Registry.CurrentUser.OpenSubKey(UninstallKey)) {
                if ((string)key.GetValue("DisplayVersion") != ReleaseInfo.Version) throw new Exception("Installed version mismatch");
                if (key.GetValue("DisplayIcon") == null) throw new Exception("Installed icon missing");
            }
            byte[] previousSettings = File.ReadAllBytes(Path.Combine(Root, "settings.json"));
            FailInstallForTest = true;
            try { Install(new string('b', 32), Path.Combine(testRoot, "OtherOutput"), security); throw new Exception("Failure was not raised"); }
            catch (IOException expected) { if (expected.Message != "Simulated install failure") throw; }
            finally { FailInstallForTest = false; }
            if (!BytesEqual(previousSettings, File.ReadAllBytes(Path.Combine(Root, "settings.json")))) throw new Exception("Rollback changed settings");
            using (var key = Registry.CurrentUser.CreateSubKey(ModulesKey + @"\Uses")) { key.SetValue(ModuleName, 1); key.SetValue("OtherProduct", 1); }
            if (!File.Exists(Path.Combine(Root, "AIChatExporter.HwpHost.exe"))) throw new Exception("Host not installed");
            using (var key = Registry.CurrentUser.OpenSubKey(ModulesKey)) if (key.GetValue(ModuleName) == null) throw new Exception("Module not registered");
            using (var locked = new FileStream(Path.Combine(Root, "AIChatExporter.HwpHost.exe"), FileMode.Open, FileAccess.Read, FileShare.None)) {
                try { Remove(); throw new Exception("Locked file was not rejected"); }
                catch (IOException expected) { if (!expected.Message.Contains("다시 제거")) throw; }
            }
            if (!File.Exists(Path.Combine(security, "FilePathCheckerModuleExample.dll"))) throw new Exception("Locked uninstall changed state");
            Remove();
            if (Directory.Exists(Root)) throw new Exception("Application files left behind");
            if (File.Exists(Path.Combine(security, "FilePathCheckerModuleExample.dll"))) throw new Exception("Module left behind");
            if (!File.Exists(Path.Combine(docs, "keep.hwpx")) || !File.Exists(Path.Combine(security, "keep.txt"))) throw new Exception("Unrelated file removed");
            using (var key = Registry.CurrentUser.OpenSubKey(ModulesKey)) if ((string)key.GetValue("OtherProduct") != "preserve" || key.GetValue(ModuleName) != null) throw new Exception("Registry ownership failure");
            using (var key = Registry.CurrentUser.OpenSubKey(ProductKey)) if (key != null) throw new Exception("Product registry left behind");
            using (var key = Registry.CurrentUser.OpenSubKey(ModulesKey + @"\Uses")) if (key.GetValue(ModuleName) != null || (int)key.GetValue("OtherProduct") != 1) throw new Exception("Module Uses ownership failure");
            using (var key = Registry.CurrentUser.OpenSubKey(UninstallKey)) if (key != null) throw new Exception("Uninstall registry left behind");
            File.WriteAllText(report, "PASS: install, repair, failure rollback, locked-file refusal, uninstall; product files and values removed; user documents and unrelated files/registry preserved. Isolated test registry only.");
            return 0;
        } catch (Exception error) { File.WriteAllText(report, error.ToString()); return 1; }
        finally { Registry.CurrentUser.DeleteSubKeyTree(testKey, false); }
    }
}

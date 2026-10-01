using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;

namespace AIChatExporter.NativeHost
{
    internal sealed class NativeMessage
    {
        public string type { get; set; }
        public string requestId { get; set; }
        public int totalChunks { get; set; }
        public int index { get; set; }
        public string data { get; set; }
    }

    internal sealed class ExportPayload
    {
        public int schemaVersion { get; set; }
        public string title { get; set; }
        public string source { get; set; }
        public string createdAt { get; set; }
        public string privacy { get; set; }
        public string html { get; set; }
        public string format { get; set; }
        public EquationPayload[] equations { get; set; }
    }

    internal sealed class EquationPayload
    {
        public string marker { get; set; }
        public string script { get; set; }
        public bool display { get; set; }
        public double fontSize { get; set; }
    }

    internal sealed class RequestBuffer
    {
        public int TotalChunks;
        public int Characters;
        public readonly SortedDictionary<int, string> Chunks = new SortedDictionary<int, string>();
    }

    internal static class Program
    {
        private const string HostVersion = ReleaseInfo.Version;
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };

        [STAThread]
        private static int Main(string[] args)
        {
            if (args.Length == 1 && args[0] == "--settings") { HostSettings.ChooseFolder(); return 0; }
            if (args.Length == 3 && args[0] == "--edit-test")
            {
                try { HwpExporter.VerifyEdit(args[1], args[2]); return 0; }
                catch (Exception error) { Console.Error.WriteLine(FriendlyError(error)); return 1; }
            }
            if (args.Length >= 2 && args[0] == "--self-test")
            {
                return RunSelfTest(args[1], args.Length >= 3 ? args[2] : null);
            }

            var requests = new Dictionary<string, RequestBuffer>(StringComparer.Ordinal);
            try
            {
                using (var input = Console.OpenStandardInput())
                using (var output = Console.OpenStandardOutput())
                {
                    while (true)
                    {
                        string json = ReadMessage(input);
                        if (json == null) return 0;
                        NativeMessage message = Json.Deserialize<NativeMessage>(json);
                        if (message == null || String.IsNullOrWhiteSpace(message.requestId)) continue;

                        if (message.type == "ping")
                        {
                            // Connection-only probe: no document data, filesystem writes or COM activation.
                            WriteMessage(output, new { ok = true, type = "pong", requestId = message.requestId, hostVersion = HostVersion });
                        }
                        else if (message.type == "settings" || message.type == "choose-folder")
                        {
                            try {
                                if (message.type == "choose-folder") HostSettings.ChooseFolder();
                                WriteMessage(output, new { ok = true, requestId = message.requestId, outputDirectory = HostSettings.OutputDirectory, hostVersion = HostVersion });
                            } catch (Exception error) { WriteMessage(output, new { ok = false, requestId = message.requestId, error = FriendlyError(error) }); }
                        }
                        else if (message.type == "start")
                        {
                            if (message.totalChunks < 1 || message.totalChunks > 512 || requests.Count > 0) {
                                WriteMessage(output, new { ok = false, requestId = message.requestId, error = "잘못되었거나 중복된 변환 요청입니다." }); continue;
                            }
                            requests[message.requestId] = new RequestBuffer { TotalChunks = message.totalChunks };
                        }
                        else if (message.type == "chunk" && requests.ContainsKey(message.requestId))
                        {
                            RequestBuffer incoming = requests[message.requestId];
                            incoming.Characters += (message.data ?? String.Empty).Length;
                            if (message.index != incoming.Chunks.Count || message.index >= incoming.TotalChunks || incoming.Characters > 64 * 1024 * 1024) {
                                requests.Remove(message.requestId);
                                WriteMessage(output, new { ok = false, requestId = message.requestId, error = "문서 조각의 순서 또는 크기가 올바르지 않습니다." }); continue;
                            }
                            requests[message.requestId].Chunks[message.index] = message.data ?? String.Empty;
                        }
                        else if (message.type == "finish" && requests.ContainsKey(message.requestId))
                        {
                            RequestBuffer buffer = requests[message.requestId];
                            requests.Remove(message.requestId);
                            try
                            {
                                if (buffer.Chunks.Count != buffer.TotalChunks) throw new InvalidDataException("패키지 조각이 누락되었습니다.");
                                var payloadJson = new StringBuilder();
                                foreach (KeyValuePair<int, string> chunk in buffer.Chunks) payloadJson.Append(chunk.Value);
                                ExportPayload payload = Json.Deserialize<ExportPayload>(payloadJson.ToString());
                                string path = HwpExporter.Export(payload, null, null);
                                string openWarning = null;
                                try
                                {
                                    // Open the saved file normally after the conversion COM instance is closed.
                                    Process.Start(new ProcessStartInfo(path) { UseShellExecute = true });
                                }
                                catch (Exception error)
                                {
                                    openWarning = "저장은 완료했지만 편집 창을 열지 못했습니다. 저장된 파일을 직접 열어 주세요. " + FriendlyError(error);
                                }
                                WriteMessage(output, new { ok = true, requestId = message.requestId, outputPath = path, openWarning = openWarning, hostVersion = HostVersion });
                            }
                            catch (Exception error)
                            {
                                WriteMessage(output, new { ok = false, requestId = message.requestId, error = FriendlyError(error), hostVersion = HostVersion });
                            }
                        }
                    }
                }
            }
            catch (Exception error)
            {
                Console.Error.WriteLine(error);
                return 1;
            }
        }

        private static int RunSelfTest(string htmlPath, string outputPath)
        {
            try
            {
                if (!File.Exists(htmlPath)) throw new FileNotFoundException("테스트 HTML을 찾지 못했습니다.", htmlPath);
                var payload = htmlPath.EndsWith(".json", StringComparison.OrdinalIgnoreCase)
                    ? Json.Deserialize<ExportPayload>(File.ReadAllText(htmlPath, Encoding.UTF8))
                    : new ExportPayload
                {
                    schemaVersion = 2,
                    title = "AI Chat Exporter HWPX 수식 보존 테스트",
                    source = "local-self-test",
                    privacy = "local-only",
                    html = File.ReadAllText(htmlPath, Encoding.UTF8),
                    format = "HWPX"
                };
                string result = HwpExporter.Export(payload, outputPath, Path.GetDirectoryName(Path.GetFullPath(htmlPath)));
                Console.WriteLine(result);
                return 0;
            }
            catch (Exception error)
            {
                Console.Error.WriteLine(FriendlyError(error));
                return 1;
            }
        }

        private static string FriendlyError(Exception error)
        {
            Exception current = error;
            while (current.InnerException != null) current = current.InnerException;
            return current.Message + " (" + current.GetType().Name + ")";
        }

        private static string ReadMessage(Stream input)
        {
            byte[] header = ReadExactly(input, 4);
            if (header == null) return null;
            int length = BitConverter.ToInt32(header, 0);
            if (length <= 0 || length > 64 * 1024 * 1024) throw new InvalidDataException("Native Messaging 메시지 크기가 올바르지 않습니다.");
            byte[] body = ReadExactly(input, length);
            if (body == null) throw new EndOfStreamException("Native Messaging 메시지가 중간에 끝났습니다.");
            return Encoding.UTF8.GetString(body);
        }

        private static byte[] ReadExactly(Stream input, int length)
        {
            var buffer = new byte[length];
            int offset = 0;
            while (offset < length)
            {
                int read = input.Read(buffer, offset, length - offset);
                if (read == 0) return null;
                offset += read;
            }
            return buffer;
        }

        private static void WriteMessage(Stream output, object value)
        {
            byte[] body = Encoding.UTF8.GetBytes(Json.Serialize(value));
            byte[] header = BitConverter.GetBytes(body.Length);
            output.Write(header, 0, header.Length);
            output.Write(body, 0, body.Length);
            output.Flush();
        }
    }

    internal static class HostSettings
    {
        internal const string ModuleName = "FilePathCheckerModuleExample";
        private static string SettingsPath { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CrowScienceLab", "Chat2HwpPdf", "settings.json"); } }
        internal static string OutputDirectory {
            get {
                if (File.Exists(SettingsPath)) {
                    var settings = new JavaScriptSerializer().Deserialize<Dictionary<string, string>>(File.ReadAllText(SettingsPath));
                    string directory;
                    if (settings.TryGetValue("outputDirectory", out directory) && Path.IsPathRooted(directory)) return Path.GetFullPath(directory);
                }
                return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Chat2Hwp&Pdf");
            }
        }
        internal static void ChooseFolder() {
            Application.EnableVisualStyles();
            using (var dialog = new FolderBrowserDialog()) {
                dialog.Description = "수식Chat — HWPX 기본 저장 폴더를 선택하세요";
                dialog.SelectedPath = OutputDirectory;
                if (dialog.ShowDialog() != DialogResult.OK) return;
                Directory.CreateDirectory(Path.GetDirectoryName(SettingsPath));
                File.WriteAllText(SettingsPath, new JavaScriptSerializer().Serialize(new { outputDirectory = dialog.SelectedPath }), new UTF8Encoding(false));
            }
        }
        internal static void RegisterSecurityModule(dynamic app) {
            // Use the official Automation module name and registry structure.
            using (var key = Registry.CurrentUser.OpenSubKey(@"Software\HNC\HwpAutomation\Modules")) {
                string modulePath = key == null ? null : key.GetValue(ModuleName) as string;
                if (String.IsNullOrWhiteSpace(modulePath) || !File.Exists(modulePath)) return;
                if (!(bool)app.RegisterModule("FilePathCheckDLL", ModuleName))
                    throw new InvalidOperationException("보안 승인 모듈을 불러오지 못했습니다. 한글 보안 모듈 등록을 확인해 주세요.");
            }
        }
    }

    internal static class HwpExporter
    {
        public static void VerifyEdit(string input, string output)
        {
            object instance = null;
            try
            {
                Console.Error.WriteLine("[EDIT] activation");
                instance = Activator.CreateInstance(Type.GetTypeFromProgID("HWPFrame.HwpObject"));
                dynamic app = instance;
                HostSettings.RegisterSecurityModule(app);
                app.XHwpWindows.Active_XHwpWindow.Visible = true;
                Console.Error.WriteLine("[EDIT] open");
                if (!(bool)app.Open(Path.GetFullPath(input), "HWPX", "")) throw new IOException("Cannot open test document");
                dynamic control = app.HeadCtrl;
                while (control != null && (string)control.CtrlID != "eqed") control = control.Next;
                if (control == null) throw new InvalidOperationException("No equation object");
                dynamic properties = control.Properties;
                string before = properties.Item("String");
                properties.SetItem("String", "F = m a + 1");
                control.Properties = properties;
                if ((string)control.Properties.Item("String") != "F = m a + 1") throw new InvalidOperationException("Equation editing failed");
                Console.Error.WriteLine("[EDIT] save");
                if (!(bool)app.SaveAs(Path.GetFullPath(output), "HWPX", "")) throw new IOException("Cannot save edited document");
                app.Clear(1);
                Console.WriteLine("Edited equation: " + before + " -> F = m a + 1");
            }
            finally
            {
                if (instance != null)
                {
                    try { ((dynamic)instance).Quit(); } catch { }
                    Marshal.FinalReleaseComObject(instance);
                }
            }
        }
        private static readonly Regex DataImage = new Regex("src=([\"'])data:image/(?<type>png|jpeg|jpg);base64,(?<data>[^\"']+)\\1", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex LocalImage = new Regex("src=([\"'])(?<path>(?!data:|https?:|file:|#)[^\"']+)\\1", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public static string Export(ExportPayload payload, string explicitOutputPath, string resourceBaseDirectory)
        {
            Action<string> trace = message => { if (!String.IsNullOrWhiteSpace(explicitOutputPath)) Console.Error.WriteLine("[HWP] " + message); };
            if (payload == null || payload.schemaVersion != 2) throw new InvalidDataException("편집 가능한 수식용 확장 0.3.0으로 새로고침해 주세요. 이전 그림 수식 패키지는 처리하지 않습니다.");
            if (!String.Equals(payload.privacy, "local-only", StringComparison.Ordinal)) throw new InvalidDataException("로컬 전용 패키지만 처리할 수 있습니다.");
            if (String.IsNullOrWhiteSpace(payload.html)) throw new InvalidDataException("문서 HTML이 비어 있습니다.");

            string format = "HWPX";
            string extension = format == "HWP" ? ".hwp" : ".hwpx";
            string outputPath = explicitOutputPath;
            if (String.IsNullOrWhiteSpace(outputPath))
            {
                string exportDirectory = HostSettings.OutputDirectory;
                Directory.CreateDirectory(exportDirectory);
                outputPath = UniquePath(exportDirectory, SafeFileName(payload.title) + extension);
            }
            outputPath = Path.GetFullPath(outputPath);
            Directory.CreateDirectory(Path.GetDirectoryName(outputPath));

            string tempDirectory = Path.Combine(Path.GetTempPath(), "AIChatExporter", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDirectory);
            object hwp = null;
            try
            {
                int imageIndex = 0;
                string html = DataImage.Replace(payload.html, match =>
                {
                    string imageType = match.Groups["type"].Value.ToLowerInvariant() == "png" ? "png" : "jpg";
                    string imagePath = Path.Combine(tempDirectory, "image-" + (++imageIndex).ToString("D4") + "." + imageType);
                    File.WriteAllBytes(imagePath, Convert.FromBase64String(match.Groups["data"].Value));
                    return "src=" + match.Groups[1].Value + new Uri(imagePath).AbsoluteUri + match.Groups[1].Value;
                });
                if (!String.IsNullOrWhiteSpace(resourceBaseDirectory))
                {
                    html = LocalImage.Replace(html, match =>
                    {
                        string candidate = Path.GetFullPath(Path.Combine(resourceBaseDirectory, Uri.UnescapeDataString(match.Groups["path"].Value)));
                        if (!File.Exists(candidate)) return match.Value;
                        return "src=" + match.Groups[1].Value + new Uri(candidate).AbsoluteUri + match.Groups[1].Value;
                    });
                }
                string htmlPath = Path.Combine(tempDirectory, "document.html");
                File.WriteAllText(htmlPath, html, new UTF8Encoding(true));

                trace("COM type lookup");
                Type type = Type.GetTypeFromProgID("HWPFrame.HwpObject");
                if (type == null) throw new InvalidOperationException("HWPFrame.HwpObject가 등록되어 있지 않습니다. 한글 데스크톱 설치를 확인해 주세요.");
                trace("COM activation");
                hwp = Activator.CreateInstance(type);
                trace("COM activated");
                dynamic app = hwp;
                HostSettings.RegisterSecurityModule(app);
                // Keep file-access prompts reachable; never auto-approve security dialogs.
                app.XHwpWindows.Active_XHwpWindow.Visible = true;
                trace("HTML open");
                bool opened = app.Open(htmlPath, "HTML", "");
                if (!opened) throw new InvalidOperationException("한글이 중간 HTML 문서를 열지 못했습니다.");
                trace("Editable equations");
                InsertEquations(app, payload.equations ?? new EquationPayload[0]);
                // HTML tables must occupy a text line, not float under the following equation.
                dynamic tableControl = app.HeadCtrl;
                while (tableControl != null) {
                    if ((string)tableControl.CtrlID == "tbl") {
                        dynamic tableProperties = tableControl.Properties;
                        tableProperties.SetItem("TreatAsChar", 1);
                        tableControl.Properties = tableProperties;
                    }
                    tableControl = tableControl.Next;
                }
                trace("HWPX save");
                bool saved = app.SaveAs(outputPath, format, "");
                if (!saved) throw new InvalidOperationException("한글이 " + format + " 문서를 저장하지 못했습니다.");
                if (!File.Exists(outputPath) || new FileInfo(outputPath).Length == 0)
                    throw new IOException("저장된 파일을 확인하지 못했습니다: " + outputPath);
                trace("saved");
                try { app.Clear(1); } catch { }
                return outputPath;
            }
            finally
            {
                if (hwp != null)
                {
                    try { ((dynamic)hwp).Quit(); } catch { }
                    try { Marshal.FinalReleaseComObject(hwp); } catch { }
                }
                try { Directory.Delete(tempDirectory, true); } catch { }
            }
        }

        private static void InsertEquations(dynamic app, EquationPayload[] equations)
        {
            var markers = new HashSet<string>(StringComparer.Ordinal);
            foreach (EquationPayload equation in equations)
            {
                if (equation == null || String.IsNullOrWhiteSpace(equation.script) ||
                    !Regex.IsMatch(equation.marker ?? "", "^AICEEQ[a-zA-Z0-9]+END$") || !markers.Add(equation.marker))
                    throw new InvalidDataException("수식 패키지의 내용 또는 위치 표식이 잘못되었습니다.");
                app.HAction.Run("MoveDocBegin");
                dynamic find = app.HParameterSet.HFindReplace;
                app.HAction.GetDefault("RepeatFind", find.HSet);
                find.FindString = equation.marker;
                find.Direction = app.FindDir("Forward");
                find.IgnoreMessage = 1;
                find.FindRegExp = 0;
                find.UseWildCards = 0;
                find.WholeWordOnly = 0;
                find.FindType = 1;
                find.IgnoreFindString = 0;
                if (!(bool)app.HAction.Execute("RepeatFind", find.HSet))
                    throw new InvalidOperationException("문서에서 수식 위치를 찾지 못했습니다.");
                app.HAction.Run("Delete");
                dynamic eq = app.HParameterSet.HEqEdit;
                app.HAction.GetDefault("EquationCreate", eq.HSet);
                eq.EqFontName = "HancomEQN";
                eq.String = equation.script;
                eq.BaseUnit = app.PointToHwpUnit(equation.fontSize >= 8 && equation.fontSize <= 20 ? equation.fontSize : 11.0);
                if (!(bool)app.HAction.Execute("EquationCreate", eq.HSet))
                    throw new InvalidOperationException("한글 수식 개체를 삽입하지 못했습니다.");
                // Anchor to the text line, so equations cannot float over other paragraphs.
                app.FindCtrl();
                dynamic shape = app.HParameterSet.HShapeObject;
                app.HAction.GetDefault("EquationPropertyDialog", shape.HSet);
                shape.HSet.SetItem("ShapeType", 3);
                shape.Version = "Equation Version 60";
                shape.EqFontName = "HancomEQN";
                shape.HSet.SetItem("ApplyTo", 0);
                shape.HSet.SetItem("TreatAsChar", 1);
                if (!(bool)app.HAction.Execute("EquationPropertyDialog", shape.HSet))
                    throw new InvalidOperationException("수식의 글자처럼 취급 속성을 적용하지 못했습니다.");
                app.HAction.Run("Cancel");
            }
            int count = 0;
            dynamic control = app.HeadCtrl;
            while (control != null)
            {
                if ((string)control.CtrlID == "eqed") count++;
                control = control.Next;
            }
            if (count != equations.Length) throw new InvalidOperationException("삽입된 수식 개체 수가 원문과 일치하지 않습니다.");
        }

        private static string SafeFileName(string title)
        {
            string value = String.IsNullOrWhiteSpace(title) ? "AI Chat Export" : title.Trim();
            foreach (char invalid in Path.GetInvalidFileNameChars()) value = value.Replace(invalid, '_');
            if (value.Length > 80) value = value.Substring(0, 80).Trim();
            return value;
        }

        private static string UniquePath(string directory, string fileName)
        {
            string path = Path.Combine(directory, fileName);
            if (!File.Exists(path)) return path;
            string stem = Path.GetFileNameWithoutExtension(fileName);
            string extension = Path.GetExtension(fileName);
            for (int index = 2; index < 10000; index++)
            {
                path = Path.Combine(directory, stem + " (" + index + ")" + extension);
                if (!File.Exists(path)) return path;
            }
            throw new IOException("고유한 출력 파일 이름을 만들지 못했습니다.");
        }
    }
}

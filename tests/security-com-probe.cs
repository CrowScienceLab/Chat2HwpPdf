using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Principal;
using Microsoft.Win32;
class SecurityComProbe {
    [STAThread] static int Main(string[] args) {
        const string name = "FilePathCheckerModuleExample";
        const string path = @"Software\HNC\HwpAutomation\Modules";
        using (var key = Registry.CurrentUser.CreateSubKey(path)) {
            object old = key.GetValue(name);
            var kind = old == null ? RegistryValueKind.String : key.GetValueKind(name);
            object instance = null;
            try {
                key.SetValue(name, args[0], RegistryValueKind.String);
                Console.WriteLine("User: " + WindowsIdentity.GetCurrent().Name + "; bits: " + IntPtr.Size * 8);
                instance = Activator.CreateInstance(Type.GetTypeFromProgID("HWPFrame.HwpObject"));
                dynamic app = instance;
                Console.WriteLine("Version: " + app.Version);
                Console.WriteLine("Initial registration: " + app.RegisterModule("FilePathCheckDLL", name));
                app.XHwpWindows.Active_XHwpWindow.Visible = true;
                Console.WriteLine("After window initialization: " + app.RegisterModule("FilePathCheckDLL", name));
                foreach (var process in Process.GetProcessesByName("Hwp")) {
                    Console.WriteLine("Hwp PID: " + process.Id + "; path: " + process.MainModule.FileName);
                    foreach (ProcessModule module in process.Modules)
                        if (module.ModuleName.IndexOf("PathChecker", StringComparison.OrdinalIgnoreCase) >= 0)
                            Console.WriteLine("Loaded module: " + module.FileName);
                }
                app.Quit(); return 0;
            } finally {
                if (instance != null) Marshal.FinalReleaseComObject(instance);
                if (old == null) key.DeleteValue(name, false); else key.SetValue(name, old, kind);
            }
        }
    }
}

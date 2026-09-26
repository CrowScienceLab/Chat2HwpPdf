using System;
using System.Runtime.InteropServices;
class SecurityDllProbe {
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr LoadLibrary(string path);
    [DllImport("kernel32.dll", CharSet=CharSet.Ansi, ExactSpelling=true, SetLastError=true)] static extern IntPtr GetProcAddress(IntPtr module, string name);
    [DllImport("kernel32.dll")] static extern bool FreeLibrary(IntPtr module);
    static int Main(string[] args) {
        var module = LoadLibrary(args[0]);
        Console.WriteLine("Process bits: " + (IntPtr.Size * 8));
        if (module == IntPtr.Zero) { Console.WriteLine("LoadLibrary failed: " + Marshal.GetLastWin32Error()); return 1; }
        try { var proc = GetProcAddress(module, "IsAccessiblePath"); Console.WriteLine("IsAccessiblePath found: " + (proc != IntPtr.Zero)); return proc == IntPtr.Zero ? 2 : 0; }
        finally { FreeLibrary(module); }
    }
}

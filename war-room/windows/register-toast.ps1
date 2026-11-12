# Gives the Start-menu "War Room" shortcut an AppUserModelID, so Windows notifications show "War Room" with its icon
# (instead of "Windows PowerShell"). Safe to run again. Prints the ID it set, or nothing if it could not.
. "$PSScriptRoot\common.ps1"
$lnk = (Get-ShortcutPaths).Menu
if (-not (Test-Path $lnk)) { New-WarRoomShortcut -Path $lnk -Script (Join-Path $PSScriptRoot 'open.ps1') -Description 'Open the War Room' }
$id = 'InvisibleJourneys.WarRoom'
$src = @"
using System; using System.Runtime.InteropServices;
[ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPropertyStoreWR { void GetCount(out uint c); void GetAt(uint i, out PropKeyWR k); void GetValue(ref PropKeyWR k, out PropVarWR v); void SetValue(ref PropKeyWR k, ref PropVarWR v); void Commit(); }
[StructLayout(LayoutKind.Sequential, Pack = 4)] public struct PropKeyWR { public Guid fmtid; public uint pid; }
[StructLayout(LayoutKind.Explicit)] public struct PropVarWR { [FieldOffset(0)] public ushort vt; [FieldOffset(8)] public IntPtr p; }
public static class AumidWR {
  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  static extern void SHGetPropertyStoreFromParsingName(string path, IntPtr pbc, int flags, ref Guid riid, [MarshalAs(UnmanagedType.Interface)] out IPropertyStoreWR ps);
  public static void Set(string lnk, string id) {
    Guid iid = new Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"); IPropertyStoreWR ps;
    SHGetPropertyStoreFromParsingName(lnk, IntPtr.Zero, 2, ref iid, out ps);
    PropKeyWR k = new PropKeyWR(); k.fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"); k.pid = 5;
    PropVarWR v = new PropVarWR(); v.vt = 31; v.p = Marshal.StringToCoTaskMemUni(id);
    ps.SetValue(ref k, ref v); ps.Commit(); Marshal.FreeCoTaskMem(v.p); Marshal.ReleaseComObject(ps);
  }
}
"@
try {
  if (-not ('AumidWR' -as [type])) { Add-Type -TypeDefinition $src -Language CSharp }
  [AumidWR]::Set($lnk, $id)
  Write-Output $id
} catch { }

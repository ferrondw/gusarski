Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

Function RunCommand(command)
    Dim objExec, exitCode
    Set objExec = WshShell.Exec("cmd /c " & command & " 2>&1")
    
    Do While objExec.Status = 0
        WScript.Sleep 100
    Loop
    
    RunCommand = objExec.ExitCode
End Function

Function CommandExists(command)
    On Error Resume Next
    Dim result
    result = WshShell.Run("cmd /c where " & command & " >nul 2>&1", 0, True)
    CommandExists = (result = 0)
    On Error GoTo 0
End Function

Sub ShowError(title, message)
    MsgBox message, vbCritical, title
End Sub

Sub ShowInfo(title, message)
    MsgBox message, vbInformation, title
End Sub

If CommandExists("git") Then
    Dim gitResult
    gitResult = RunCommand("git pull")
    If gitResult <> 0 Then
    End If
End If

If Not CommandExists("npm") Then
    ShowError "NPM Not Found", "NPM is not installed or not in PATH." & vbCrLf & vbCrLf & "Please install Node.js from https://nodejs.org/"
    WScript.Quit 1
End If

Dim npmResult
npmResult = RunCommand("npm install")
If npmResult <> 0 Then
    ShowError "NPM Install Failed", "Failed to install dependencies." & vbCrLf & vbCrLf & "Check your internet connection and try again."
    WScript.Quit 1
End If

Dim playwrightResult
playwrightResult = RunCommand("npx playwright install")
If playwrightResult <> 0 Then
    ShowError "Playwright Install Failed", "Failed to install Playwright browsers." & vbCrLf & vbCrLf & "Check your internet connection and try again."
    WScript.Quit 1
End If

WshShell.Run "cmd /c npx electron tray.js", 0, False

Set WshShell = Nothing
Set objFSO = Nothing

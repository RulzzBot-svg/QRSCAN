#include <Misc.au3>

; ----------------------------
; "||" represents moving to next column (TAB)
; Start: Ctrl + Shift + V
; Stop:  Ctrl + Q  (reliable polling)
; ----------------------------

Global $gStop = False

HotKeySet("^+v", "TypeWithTabs_Fast")
HotKeySet("^q",  "StopMacro")

While 1
    Sleep(100)
WEnd

; ---------- Helpers ----------

Func ReleaseModifiers()
    ; Force-release common modifiers so none get "stuck"
    Send("{CTRLDOWN}{CTRLUP}")
    Send("{SHIFTDOWN}{SHIFTUP}")
    Send("{ALTDOWN}{ALTUP}")
    ; Optional: Windows keys
    Send("{LWINDOWN}{LWINUP}")
    Send("{RWINDOWN}{RWINUP}")
EndFunc

Func StopMacro()
    $gStop = True
    ReleaseModifiers()
EndFunc

Func ShouldStop()
    ; HotKeySet can miss during heavy Send; polling is more reliable.
    ; Ctrl (11) + Q (51)
    If _IsPressed("11") And _IsPressed("51") Then Return True
    Return $gStop
EndFunc

; ---------- Main ----------

Func TypeWithTabs_Fast()
    $gStop = False

    ; Get clipboard text (wait briefly)
    Local $text = "", $tries = 0
    While $tries < 20
        If ShouldStop() Then
            ReleaseModifiers()
            Return
        EndIf

        $text = ClipGet()
        If Not @error And StringLen($text) > 0 Then ExitLoop
        Sleep(20)
        $tries += 1
    WEnd
    If @error Or StringLen($text) = 0 Then
        ReleaseModifiers()
        Return
    EndIf

    ; Split into fields using "||"
    Local $parts = StringSplit($text, "||", 1)
    If @error Or $parts[0] < 1 Then
        ReleaseModifiers()
        Return
    EndIf

    Local $n = $parts[0]
    For $idx = 1 To $n
        If ShouldStop() Then
            ReleaseModifiers()
            Return
        EndIf

        HandlePopupsFast()
        If ShouldStop() Then
            ReleaseModifiers()
            Return
        EndIf

        ; Send the whole field at once (FAST)
        If StringLen($parts[$idx]) > 0 Then
            Send($parts[$idx], 1) ; raw send
        EndIf

        ; TAB to next column after every field except the last
        If $idx < $n Then
            Send("{TAB}")
            Sleep(20) ; small settle time
            HandlePopupsFast()
        EndIf

        ; Yield so Windows can process input/hotkeys
        Sleep(0)
    Next

    HandlePopupsFast()
    ReleaseModifiers()
EndFunc

Func HandlePopupsFast()
    If ShouldStop() Then
        ReleaseModifiers()
        Return
    EndIf

    ; 1) Exact known popup title
    If WinExists("Not enough Quantity") Then
        WinActivate("Not enough Quantity")
        Sleep(30)
        Send("{ENTER}")
        Sleep(80)
        Return
    EndIf

    ; 2) General popup escape (reduced tries + reduced sleeps)
    Local $k = 0
    While $k < 2
        If ShouldStop() Then
            ReleaseModifiers()
            Return
        EndIf

        Local $title = WinGetTitle("[ACTIVE]")
        If @error Or $title = "" Then ExitLoop

        If StringLen($title) <= 40 And ( _
            StringInStr($title, "Warning") Or _
            StringInStr($title, "Quantity") Or _
            StringInStr($title, "QuickBooks") Or _
            StringInStr($title, "Message")) Then

            Sleep(25)
            Send("{ENTER}")
            Sleep(60)
        Else
            ExitLoop
        EndIf

        $k += 1
        Sleep(0)
    WEnd
EndFunc

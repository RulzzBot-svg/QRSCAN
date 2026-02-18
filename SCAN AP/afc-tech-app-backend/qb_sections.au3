; qb_sections_safe_blanklines_header.au3
; Ctrl+Alt+D = delete current section (SAFE, handles empty lines)
; Detects "Header" instead of "SECTION"
; Ctrl+Alt+Q = quit immediately (panic stop)

Global Const $MARKER = "Header" ; <-- change this if you want "HEADER" etc.

HotKeySet("^!d", "DeleteSectionSafe")
HotKeySet("^!q", "QuitScript")

TrayTip("QB Macro", "Running. Ctrl+Alt+D delete section | Ctrl+Alt+Q quit", 5)

While 1
    Sleep(100)
WEnd

Func QuitScript()
    Exit
EndFunc

Func CopyLineText()
    ; Best-effort: copy whatever QB can put on clipboard for the current line
    ClipPut("")
    Send("^c")
    Sleep(150)

    Local $txt = ClipGet()
    ; Normalize: trim whitespace + CRLF
    $txt = StringStripWS($txt, 3)
    Return $txt
EndFunc

Func ContainsMarker($txt)
    ; Case-insensitive match
    Return (StringInStr($txt, $MARKER, 2) > 0)
EndFunc

Func DeleteSectionSafe()
    Sleep(50)

    Local $maxDeletes = 220        ; hard limit so it can't wipe giant docs
    Local $maxEmptyReads = 12      ; tolerated consecutive empty reads
    Local $emptyReads = 0
    Local $i

    ; --- SAFETY CHECK: must start on a Header line ---
    Local $startTxt = CopyLineText()
    If Not ContainsMarker($startTxt) Then
        MsgBox(48, "QB Macro Safety Stop", _
            "Safety stop: Click the Header line first, then run the hotkey." & @CRLF & _
            "Marker: " & $MARKER & @CRLF & _
            "Clipboard text seen:" & @CRLF & _
            $startTxt)
        Return
    EndIf

    ; Delete the header + everything beneath until we reach the NEXT Header line
    For $i = 1 To $maxDeletes
        ; Delete current line
        Send("^{DEL}")
        Sleep(180)

        ; Read the new current line
        Local $txt = CopyLineText()

        ; Empty line? Tolerate and continue deleting
        If $txt = "" Then
            $emptyReads += 1
            If $emptyReads >= $maxEmptyReads Then
                MsgBox(48, "QB Macro Safety Stop", _
                    "Stopped because it could not read line text after multiple attempts." & @CRLF & _
                    "This can happen if QuickBooks doesn't copy line text on this screen or there are many blank lines." & @CRLF & _
                    "Tip: If this happens often, we can switch to a 'Delete N lines' macro.")
                ExitLoop
            EndIf
            ContinueLoop
        EndIf

        ; Got text -> reset empty counter
        $emptyReads = 0

        ; Stop when we hit the next Header line (do not delete it)
        If ContainsMarker($txt) Then
            ExitLoop
        EndIf
    Next

    TrayTip("QB Macro", "Section delete stopped.", 2)
EndFunc

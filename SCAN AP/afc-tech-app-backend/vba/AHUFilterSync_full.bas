' Module: AHUFilterSync_full.bas
' Robust VBA module for syncing filter last_service_date with the API
' Requires: JsonConverter.bas (https://github.com/VBA-tools/VBA-JSON)
Option Explicit

' --- CONFIG ---
Private Const API_BASE As String = "https://qrscan-8ql2.onrender.com/api"  ' Render URL + /api
Private Const API_TOKEN As String = ""            ' Optional bearer token (not used by default)
Private Const TECH_ID As String = "1"              ' <-- Put an admin technician id here (numeric) to authenticate via X-Tech-ID
Private Const SHEET_NAME As String = "AHU Filters"

' Columns:
' A: filter_id, B: phase, C: part_number, D: size, E: quantity,
' F: frequency_days, G: last_service_date (editable), H: invoice, I: _orig_last (hidden)

Public Sub FetchFilters()
    Dim ahuId As String
    ahuId = InputBox("Enter AHU id (numeric or label):", "Fetch AHU Filters")
    If Trim(ahuId) = "" Then Exit Sub

    Dim url As String
    url = API_BASE & "/admin/ahus/" & ahuId & "/filters?include_inactive=1"

    On Error GoTo FetchErr
    Dim jsonData As Object
    Set jsonData = HttpGetJson(url)

    Dim ws As Worksheet
    Set ws = CreateOrClearSheet(SHEET_NAME)
    WriteHeaders ws

    Dim r As Long: r = 2
    Dim item As Variant
    For Each item In jsonData
        ' Keep filter_id in column A (hidden) so we can align with your existing template starting at column B
        ws.Cells(r, 1).Value = NullToStr(item("id"))
        ' Your sheet starts at column B with BUILDING.. we'll preserve those columns and place our fields into matching columns:
        ' Part Number -> H (8), Size -> J (10), Quantity -> K (11), Frequency -> L (12)
        ws.Cells(r, 8).Value = NullToStr(item("part_number"))
        ws.Cells(r, 10).Value = NullToStr(item("size"))
        ws.Cells(r, 11).Value = NullToStr(item("quantity"))
        ws.Cells(r, 12).Value = NullToStr(item("frequency_days"))
        ' DATE OF REPLACEMENT (editable last_service_date) -> N (14)
        ws.Cells(r, 14).Value = NullToStr(item("last_service_date")) ' date string YYYY-MM-DD or null
        ' Invoice placeholder -> M (13)
        ws.Cells(r, 13).Value = ""
        ' store original last_service_date for change detection in column R (18)
        ws.Cells(r, 18).Value = NullToStr(item("last_service_date"))
        r = r + 1
    Next item

    ' Format the editable date column (N) and hide internal id/orig columns (A and R)
    ws.Columns(14).NumberFormat = "yyyy-mm-dd"
    ws.Columns(1).Hidden = True
    ws.Columns(18).Hidden = True

    MsgBox "Loaded " & (r - 2) & " filter rows.", vbInformation
    Exit Sub

FetchErr:
    MsgBox "Fetch failed: " & Err.Description, vbExclamation
End Sub

Public Sub PushUpdates()
    Dim ahuId As String
    ahuId = InputBox("Enter AHU id (same used to fetch):", "Push Updates")
    If Trim(ahuId) = "" Then Exit Sub

    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(SHEET_NAME)
    On Error GoTo 0
    If ws Is Nothing Then
        MsgBox "Sheet '" & SHEET_NAME & "' not found. Run Fetch first.", vbExclamation
        Exit Sub
    End If

    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    If lastRow < 2 Then
        MsgBox "No data to push.", vbInformation
        Exit Sub
    End If

    Dim r As Long
    Dim errors As Collection: Set errors = New Collection
    Dim successCount As Long: successCount = 0

    For r = 2 To lastRow
        Dim fid As String
        fid = Trim(CStr(ws.Cells(r, "A").Value))
        If fid = "" Then GoTo NextRow

        Dim orig As String
        orig = Trim(CStr(ws.Cells(r, "I").Value))
        Dim cur As String
        cur = Trim(CStr(ws.Cells(r, "G").Value))

        ' Only update when changed
        If cur <> orig Then
            ' Accept empty -> null (clear date)
            Dim payloadJson As String
            If cur = "" Then
                payloadJson = "{""last_service_date"": null}"
            Else
                payloadJson = "{""last_service_date"":""" & cur & """}"
            End If

            Dim url As String
            url = API_BASE & "/admin/filters/" & fid

            Dim success As Boolean
            success = HttpPatchJsonRaw(url, payloadJson)
            If success Then
                ws.Cells(r, "I").Value = cur ' update original copy
                successCount = successCount + 1
            Else
                errors.Add "Row " & r & " (filter " & fid & ") failed"
            End If
        End If
NextRow:
    Next r

    Dim msg As String
    msg = "Updates pushed: " & successCount
    If errors.Count > 0 Then
        msg = msg & vbNewLine & vbNewLine & "Errors:" & vbNewLine
        Dim e As Variant
        For Each e In errors
            msg = msg & "- " & e & vbNewLine
        Next e
        MsgBox msg, vbExclamation
    Else
        MsgBox msg, vbInformation
    End If
End Sub

' -------------------------
' Helper routines
' -------------------------
Private Function CreateOrClearSheet(name As String) As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(name)
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        ws.Name = name
    Else
        ws.Cells.Clear
    End If
    Set CreateOrClearSheet = ws
End Function

Private Sub WriteHeaders(ws As Worksheet)
    ' Write headers matching your template (starting at column B)
    ws.Cells(1, 1).Value = "filter_id"
    ws.Cells(1, 2).Value = "BUILDING"
    ws.Cells(1, 3).Value = "LOCATION"
    ws.Cells(1, 4).Value = "FLOOR/AREA"
    ws.Cells(1, 5).Value = "STAGE"
    ws.Cells(1, 6).Value = "AHU NO."
    ws.Cells(1, 7).Value = "FILTER TYPE"
    ws.Cells(1, 8).Value = "PART NUMBER"
    ws.Cells(1, 9).Value = "EFFICIENCY"
    ws.Cells(1, 10).Value = "FILTER SIZE"
    ws.Cells(1, 11).Value = "QUANTITY"
    ws.Cells(1, 12).Value = "FREQUENCY"
    ws.Cells(1, 13).Value = "INVOICE NUMBER"
    ws.Cells(1, 14).Value = "DATE OF REPLACEMENT"
    ws.Cells(1, 15).Value = "SCHEDULED DAY OF REPLACEMENT"
    ws.Cells(1, 16).Value = "PENDING ORDERS"
    ws.Cells(1, 17).Value = "NOTES"
    ws.Cells(1, 18).Value = "_orig_last"
    ws.Range(ws.Cells(1, 2), ws.Cells(1, 17)).Font.Bold = True
End Sub

Private Function NullToStr(v) As String
    If IsNull(v) Then
        NullToStr = ""
    ElseIf IsEmpty(v) Then
        NullToStr = ""
    Else
        NullToStr = CStr(v)
    End If
End Function

' HTTP helpers using WinHttp (late bound)
Private Function HttpGetJson(url As String) As Object
    Dim resp As String
    resp = HttpRequestRaw("GET", url, "")
    If resp = "" Then
        Set HttpGetJson = CreateObject("Scripting.Dictionary")
        Exit Function
    End If
    Set HttpGetJson = JsonConverter.ParseJson(resp)
End Function

Private Function HttpPatchJsonRaw(url As String, rawJson As String) As Boolean
    Dim status As Long
    status = HttpRequestStatus("PATCH", url, rawJson)
    HttpPatchJsonRaw = (status >= 200 And status < 300)
End Function

Private Function HttpRequestRaw(method As String, url As String, body As String) As String
    Dim http As Object
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
    On Error GoTo ErrHandler
    http.Open method, url, False
    http.setRequestHeader "Content-Type", "application/json"
    If Len(Trim(API_TOKEN)) > 0 Then
        http.setRequestHeader "Authorization", "Bearer " & API_TOKEN
    End If
    If Len(Trim(TECH_ID)) > 0 Then
        http.setRequestHeader "X-Tech-ID", TECH_ID
    End If
    If method = "GET" Then
        http.Send
    Else
        http.Send body
    End If
    If http.Status >= 200 And http.Status < 300 Then
        HttpRequestRaw = http.ResponseText
    Else
        HttpRequestRaw = ""
    End If
    Exit Function
ErrHandler:
    HttpRequestRaw = ""
End Function

Private Function HttpRequestStatus(method As String, url As String, body As String) As Long
    Dim http As Object
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
    On Error GoTo ErrH
    http.Open method, url, False
    http.setRequestHeader "Content-Type", "application/json"
    If Len(Trim(API_TOKEN)) > 0 Then
        http.setRequestHeader "Authorization", "Bearer " & API_TOKEN
    End If
    If Len(Trim(TECH_ID)) > 0 Then
        http.setRequestHeader "X-Tech-ID", TECH_ID
    End If
    If method = "GET" Then
        http.Send
    Else
        http.Send body
    End If
    HttpRequestStatus = http.Status
    Exit Function
ErrH:
    HttpRequestStatus = 0
End Function

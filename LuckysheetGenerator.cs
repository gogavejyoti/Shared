using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sutherland.WFMResourcePlanner.Entities.LuckySheet;
using Sutherland.WFMResourcePlanner.Utilities;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;

public static class LuckysheetGenerator
{
    private const int TemplateColumnIndex = 2; // Column 'C'

    public static string GenerateWeeklySheet(string templateJson, DateTime startDate, DateTime endDate, List<CustomWeekConfig> customWeeks, DayOfWeek weekStart, string newSheetName = null)
    {

        var sheet = JObject.Parse(templateJson);
        ReplaceSheetIndex(sheet);
        sheet["name"] = !string.IsNullOrEmpty(newSheetName)
            ? newSheetName
            : $"{sheet["name"]} ({startDate:MMM yyyy} - {endDate:MMM yyyy})";

        sheet["luckysheet_select_save"] = new JArray(
            new JObject
            {
            { "row", new JArray(0, 0) },
            { "column", new JArray(0, 0) },
            { "row_focus", 0 },
            { "column_focus", 0 }
            });

        var celldata = (JArray)sheet["celldata"];
        var calcChain = (JArray)sheet["calcChain"];
        var dataArray = (JArray)sheet["data"]; // <- Fallback for v/m values

        if (celldata == null || calcChain == null)
            throw new ArgumentException("Template must contain both 'celldata' and 'calcChain' arrays.");

        var templateCells = celldata.Children<JObject>().Where(c => (int)c["c"] == TemplateColumnIndex).ToList();
        var templateCalcChainEntries = calcChain.Children<JObject>().Where(c => (int)c["c"] == TemplateColumnIndex).ToList();

        ClearStaleFormulaValuesInColumn(celldata, TemplateColumnIndex);

        int currentColumnIndex = TemplateColumnIndex;
        for (var date = startDate; date <= endDate; date = date.AddDays(7))
        {
            DateTime weekStartMonday = GetStartOfWeek(date, weekStart);

            if (date == startDate)
            {
                UpdateHeaderCells(celldata, currentColumnIndex, weekStartMonday);


                // 🔁 Patch column C's formula cells with evaluated data
                foreach (var templateCell in templateCells.Where(c => (int)c["r"] > 2))
                {
                    var formulaToken = templateCell.SelectToken("v.f");
                    if (formulaToken != null && formulaToken.Type != JTokenType.Null)
                    {
                        var originalV = templateCell["v"];
                        int row = (int)templateCell["r"];
                        int col = (int)templateCell["c"];

                        JObject fromData = null;
                        if (dataArray?.Count > row)
                        {
                            var rowArray = dataArray[row] as JArray;
                            if (rowArray != null && rowArray.Count > col && rowArray[col]?.Type == JTokenType.Object)
                                fromData = (JObject)rowArray[col];
                        }

                        // 🔁 Patch the formula cell with values from data
                        originalV["v"] = fromData?["v"] ?? originalV["v"];
                        originalV["m"] = fromData?["m"] ?? originalV["m"];
                    }
                }

                continue;
            }

            currentColumnIndex++;
            int columnOffset = currentColumnIndex - TemplateColumnIndex;

            UpdateHeaderCells(celldata, currentColumnIndex, weekStartMonday);

            foreach (var templateCell in templateCells.Where(c => (int)c["r"] > 2))
            {
                var newCell = (JObject)templateCell.DeepClone();
                newCell["c"] = currentColumnIndex;

                var formulaToken = newCell.SelectToken("v.f");
                if (formulaToken != null && formulaToken.Type != JTokenType.Null)
                {
                    string oldFormula = formulaToken.ToString();
                    string updatedFormula = UpdateFormulaReferences(oldFormula, columnOffset);
                    newCell["v"]["f"] = updatedFormula;

                    // ✅ Pull evaluated values from data[][] fallback
                    var originalV = templateCell["v"];
                    int row = (int)templateCell["r"];
                    int col = (int)templateCell["c"];

                    JObject fromData = null;
                    if (dataArray?.Count > row)
                    {
                        var rowArray = dataArray[row] as JArray;
                        if (rowArray != null && rowArray.Count > col && rowArray[col]?.Type == JTokenType.Object)
                            fromData = (JObject)rowArray[col];
                    }

                    newCell["v"]["v"] = fromData?["v"] ?? originalV["v"];
                    newCell["v"]["m"] = fromData?["m"] ?? originalV["m"];
                }

                celldata.Add(newCell);
            }

            foreach (var templateEntry in templateCalcChainEntries)
            {
                var newEntry = (JObject)templateEntry.DeepClone();
                newEntry["c"] = currentColumnIndex;

                var funcArray = (JArray)newEntry["func"];
                if (funcArray != null && funcArray.Count > 2)
                {
                    string oldFormula = funcArray[2].ToString();
                    string updatedFormula = UpdateFormulaReferences(oldFormula, columnOffset);
                    funcArray[2] = updatedFormula;
                }

                calcChain.Add(newEntry);
            }
        }

    
        RebuildDataArray(sheet);

        foreach(var custWeek in customWeeks)
        {
            if (custWeek.Weeks.Count > 0)
            {
                LuckySheetRowInserter.
                InsertRowsBelowHeaderWithFormula(sheet, custWeek.Header, custWeek.Weeks);
            }
        }
        return sheet.ToString(Formatting.Indented);
    }


    #region Helpers

    private static void ReplaceSheetIndex(JObject sheet)
    {
        string oldIndex = sheet["index"]?.ToString();
        if (string.IsNullOrEmpty(oldIndex)) return;

        string newIndex = GenerateUniqueSheetIndex();

        // Replace root index
        sheet["index"] = newIndex;

        // Recursively replace everywhere
        ReplaceIndexRecursive(sheet, oldIndex, newIndex);
    }

    private static void ReplaceIndexRecursive(JToken token, string oldIndex, string newIndex)
    {
        if (token.Type == JTokenType.Object)
        {
            foreach (var property in ((JObject)token).Properties())
            {
                if (property.Value.Type == JTokenType.String && property.Value.ToString() == oldIndex)
                {
                    property.Value = newIndex;
                }
                else
                {
                    ReplaceIndexRecursive(property.Value, oldIndex, newIndex);
                }
            }
        }
        else if (token.Type == JTokenType.Array)
        {
            foreach (var item in (JArray)token)
            {
                ReplaceIndexRecursive(item, oldIndex, newIndex);
            }
        }
    }


    private static string GenerateUniqueSheetIndex()
    {
        return $"Sheet_{Guid.NewGuid():N}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
    }

    private static void RebuildDataArray(JObject sheet)
    {
        var celldata = (JArray)sheet["celldata"];
        if (celldata == null || !celldata.HasValues) { sheet["data"] = new JArray(); return; }

        int maxRow = celldata.Max(c => (int)c["r"]);
        int maxCol = celldata.Max(c => (int)c["c"]);
        var data = new JArray();

        for (int i = 0; i <= maxRow; i++)
        {
            var row = new JArray();
            for (int j = 0; j <= maxCol; j++) row.Add(null);
            data.Add(row);
        }

        foreach (var cell in celldata.Children<JObject>())
        {
            int r = (int)cell["r"];
            int c = (int)cell["c"];
            data[r][c] = cell["v"];
        }

        sheet["data"] = data;
    }

    private static void ClearStaleFormulaValuesInColumn(JArray celldata, int columnIndex)
    {
        foreach (var cell in celldata.Children<JObject>()
                     .Where(c => (int)c["c"] == columnIndex && c.SelectToken("v.f") != null))
        {
            cell["v"]["v"] = null;
            cell["v"]["m"] = null;
        }
    }

    private static void UpdateHeaderCells(JArray celldata, int columnIndex, DateTime weekStart)
    {
        var ct = new { fa = "General", t = "g" };

        GetOrCreateCell(celldata, 0, columnIndex)["v"] = JObject.FromObject(new
        {
            m = weekStart.ToString("MMM-yy", CultureInfo.InvariantCulture),
            v = weekStart.ToString("MMM-yy", CultureInfo.InvariantCulture),
            ct
        });

        GetOrCreateCell(celldata, 1, columnIndex)["v"] = JObject.FromObject(new
        {
            m = weekStart.ToString("dd-MMM-yy", CultureInfo.InvariantCulture),
            v = weekStart.ToString("dd-MMM-yy", CultureInfo.InvariantCulture),
            bl = 1,
            ct
        });

        GetOrCreateCell(celldata, 2, columnIndex)["v"] = JObject.FromObject(new
        {
            m = weekStart.AddDays(6).ToString("dd-MMM-yy", CultureInfo.InvariantCulture),
            v = weekStart.AddDays(6).ToString("dd-MMM-yy", CultureInfo.InvariantCulture),
            ct
        });
    }

    private static JObject GetOrCreateCell(JArray celldata, int r, int c)
    {
        var cell = celldata.Children<JObject>().FirstOrDefault(jc => (int)jc["r"] == r && (int)jc["c"] == c);
        if (cell == null)
        {
            cell = new JObject { { "r", r }, { "c", c } };
            celldata.Add(cell);
        }
        return cell;
    }

    private static string UpdateFormulaReferences(string formula, int columnOffset)
    {
        string pattern = @"(\$?)([A-Z]+)(\$?)(\d+)";
        return Regex.Replace(formula, pattern, match =>
        {
            string colAbs = match.Groups[1].Value;
            string col = match.Groups[2].Value;
            string rowAbs = match.Groups[3].Value;
            string row = match.Groups[4].Value;

            bool isColAbsolute = colAbs == "$";
            int oldColIndex = ColumnLetterToIndex(col);
            int newColIndex = isColAbsolute ? oldColIndex : oldColIndex + columnOffset;
            string newCol = ColumnIndexToLetter(newColIndex);

            return $"{(isColAbsolute ? "$" : "")}{newCol}{rowAbs}{row}";
        });
    }

    private static string ColumnIndexToLetter(int colIndex)
    {
        string letter = string.Empty;
        while (colIndex >= 0)
        {
            letter = (char)('A' + (colIndex % 26)) + letter;
            colIndex = (colIndex / 26) - 1;
        }
        return letter;
    }

    private static int ColumnLetterToIndex(string colLetter)
    {
        int index = 0;
        foreach (char c in colLetter.ToUpper())
        {
            index = index * 26 + (c - 'A' + 1);
        }
        return index - 1;
    }

    private static DateTime GetStartOfWeek(DateTime dt, DayOfWeek weekStart)
    {
        int diff = (7 + (dt.DayOfWeek - weekStart)) % 7;
        return dt.AddDays(-1 * diff).Date;
    }





    #endregion
}

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using CsvHelper;
using CsvHelper.Configuration;
using Newtonsoft.Json;
using System.Globalization;
using System.Formats.Asn1;

class Program
{
    static async Task Main()
    {
        var filePath = "questions.csv";
        var qnaList = ReadCsv(filePath);
        Console.WriteLine($"📄 Loaded {qnaList.Count} rows from CSV");

        foreach (var qa in qnaList)
        {
            try
            {
                var embedding = await GetEmbedding(qa.QuestionText);
                var jsonEmbedding = JsonConvert.SerializeObject(embedding);
                await SaveToDatabase(qa.QuestionText, qa.AnswerText, jsonEmbedding);

                Console.WriteLine($"✅ Inserted: {qa.QuestionText}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error with '{qa.QuestionText}': {ex.Message}");
            }
        }

        Console.WriteLine("✅ All data processed.");
    }

    static List<QuestionAnswerModel> ReadCsv(string path)
    {
        using var reader = new StreamReader(path);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture));
        return csv.GetRecords<QuestionAnswerModel>().ToList();
    }

    static async Task<List<float>> GetEmbedding(string input)
    {
        using var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "YOUR_OPENAI_API_KEY");

        var body = new
        {
            input = input,
            model = "text-embedding-3-small"
        };

        var response = await http.PostAsync("https://api.openai.com/v1/embeddings",
            new StringContent(JsonConvert.SerializeObject(body), Encoding.UTF8, "application/json"));

        var json = await response.Content.ReadAsStringAsync();
        dynamic result = JsonConvert.DeserializeObject(json);
        return ((IEnumerable<dynamic>)result.data[0].embedding).Select(e => (float)e).ToList();
    }

    static async Task SaveToDatabase(string question, string answer, string embeddingJson)
    {
        using var conn = new SqlConnection(ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString);
        await conn.OpenAsync();

        var cmd = new SqlCommand(@"
            INSERT INTO QuestionAnswer (QuestionText, AnswerText, EmbeddingJson)
            VALUES (@question, @answer, @embedding)", conn);

        cmd.Parameters.AddWithValue("@question", question);
        cmd.Parameters.AddWithValue("@answer", answer);
        cmd.Parameters.AddWithValue("@embedding", embeddingJson);
        await cmd.ExecuteNonQueryAsync();
    }
}

public class QuestionAnswerModel
{
    public string QuestionText { get; set; }
    public string AnswerText { get; set; }
}

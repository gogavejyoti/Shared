using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using CsvHelper;
using CsvHelper.Configuration;
using Newtonsoft.Json;

class Program
{
    static readonly string azureEndpoint = "https://<your-resource-name>.openai.azure.com/";
    static readonly string azureApiKey = "<your-api-key>";
    static readonly string deploymentName = "embedding-model"; // your deployed model name
    static readonly string apiVersion = "2024-02-15-preview";

    static async Task Main()
    {
        var qnaList = ReadCsv("questions.csv");
        Console.WriteLine($"📄 Loaded {qnaList.Count} entries from CSV...");

        foreach (var qa in qnaList)
        {
            try
            {
                var embedding = await GetAzureEmbedding(qa.QuestionText);
                var jsonEmbedding = JsonConvert.SerializeObject(embedding);

                await SaveToDatabase(qa.QuestionText, qa.AnswerText, jsonEmbedding);

                Console.WriteLine($"✅ Saved: {qa.QuestionText}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error for '{qa.QuestionText}': {ex.Message}");
            }
        }

        Console.WriteLine("✅ All done.");
    }

    static List<QuestionAnswerModel> ReadCsv(string filePath)
    {
        using var reader = new StreamReader(filePath);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture));
        return csv.GetRecords<QuestionAnswerModel>().ToList();
    }

    static async Task<List<float>> GetAzureEmbedding(string input)
    {
        using var http = new HttpClient();
        http.DefaultRequestHeaders.Add("api-key", azureApiKey);

        var url = $"{azureEndpoint}openai/deployments/{deploymentName}/embeddings?api-version={apiVersion}";

        var body = new
        {
            input = input
        };

        var content = new StringContent(JsonConvert.SerializeObject(body), Encoding.UTF8, "application/json");
        var response = await http.PostAsync(url, content);

        var result = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            throw new Exception($"Azure OpenAI Error: {result}");

        dynamic json = JsonConvert.DeserializeObject(result);
        return ((IEnumerable<dynamic>)json.data[0].embedding).Select(e => (float)e).ToList();
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

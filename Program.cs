using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

class Program
{
    static readonly string azureEndpoint = "https://<your-resource>.openai.azure.com/";
    static readonly string azureApiKey = "<your-api-key>";
    static readonly string embeddingDeployment = "text-embedding-deployment-name";
    static readonly string chatDeployment = "chatgpt-deployment-name";
    static readonly string apiVersion = "2024-02-15-preview";

    static async Task Main()
    {
        Console.WriteLine("🧠 Ask your question:");
        var userQuestion = Console.ReadLine();

        var userEmbedding = await GetAzureEmbedding(userQuestion);
        var storedQAs = await LoadQnAFromDatabase();

        var topMatches = storedQAs
            .Select(q => new
            {
                qa = q,
                similarity = CosineSimilarity(userEmbedding, q.Embedding)
            })
            .OrderByDescending(x => x.similarity)
            .Take(3)
            .Select(x => x.qa)
            .ToList();

        if (topMatches.Count == 0)
        {
            Console.WriteLine("❌ No relevant answer found.");
            return;
        }

        string finalAnswer = await SummarizeAnswerWithChatGPT(userQuestion, topMatches);

        Console.WriteLine("\n🤖 AI Answer:");
        Console.WriteLine(finalAnswer);
    }

    static async Task<List<float>> GetAzureEmbedding(string input)
    {
        using var http = new HttpClient();
        http.DefaultRequestHeaders.Add("api-key", azureApiKey);

        var url = $"{azureEndpoint}openai/deployments/{embeddingDeployment}/embeddings?api-version={apiVersion}";
        var body = new { input = input };
        var json = JsonConvert.SerializeObject(body);

        var res = await http.PostAsync(url, new StringContent(json, Encoding.UTF8, "application/json"));
        var resJson = await res.Content.ReadAsStringAsync();

        if (!res.IsSuccessStatusCode)
            throw new Exception("Azure OpenAI embedding error: " + resJson);

        dynamic result = JsonConvert.DeserializeObject(resJson);
        return ((IEnumerable<dynamic>)result.data[0].embedding).Select(e => (float)e).ToList();
    }

    static async Task<string> SummarizeAnswerWithChatGPT(string userQuestion, List<QuestionAnswerModel> matches)
    {
        var systemPrompt = "You are a helpful assistant. Use the below Q&A context to answer the user's question clearly and concisely.";
        var context = string.Join("\n\n", matches.Select(m => $"Q: {m.QuestionText}\nA: {m.AnswerText}"));

        var chatRequest = new
        {
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = $"Context:\n{context}\n\nUser Question:\n{userQuestion}" }
            },
            temperature = 0.2,
            max_tokens = 300
        };

        using var http = new HttpClient();
        http.DefaultRequestHeaders.Add("api-key", azureApiKey);

        var url = $"{azureEndpoint}openai/deployments/{chatDeployment}/chat/completions?api-version={apiVersion}";
        var content = new StringContent(JsonConvert.SerializeObject(chatRequest), Encoding.UTF8, "application/json");

        var response = await http.PostAsync(url, content);
        var responseJson = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new Exception("ChatGPT error: " + responseJson);

        dynamic result = JsonConvert.DeserializeObject(responseJson);
        return result.choices[0].message.content.ToString();
    }

    static async Task<List<QuestionAnswerModel>> LoadQnAFromDatabase()
    {
        var list = new List<QuestionAnswerModel>();
        using var conn = new SqlConnection(ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString);
        await conn.OpenAsync();

        var cmd = new SqlCommand("SELECT QuestionText, AnswerText, EmbeddingJson FROM QuestionAnswer", conn);
        var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new QuestionAnswerModel
            {
                QuestionText = reader.GetString(0),
                AnswerText = reader.GetString(1),
                Embedding = JsonConvert.DeserializeObject<List<float>>(reader.GetString(2))
            });
        }

        return list;
    }

    static float CosineSimilarity(List<float> a, List<float> b)
    {
        float dot = 0, magA = 0, magB = 0;
        for (int i = 0; i < a.Count; i++)
        {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        return dot / ((float)(Math.Sqrt(magA) * Math.Sqrt(magB)) + 1e-8f);
    }
}

class QuestionAnswerModel
{
    public string QuestionText { get; set; }
    public string AnswerText { get; set; }
    public List<float> Embedding { get; set; }
}

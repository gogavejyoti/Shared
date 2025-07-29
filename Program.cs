<?xml version="1.0" encoding="utf-8" ?>
<configuration>
  <connectionStrings>
    <add name="DefaultConnection" 
         connectionString="Server=localhost;Database=YourDb;Trusted_Connection=True;" 
         providerName="System.Data.SqlClient" />
  </connectionStrings>
</configuration>

CREATE TABLE QuestionAnswer (
    Id INT PRIMARY KEY IDENTITY,
    QuestionText NVARCHAR(MAX),
    AnswerText NVARCHAR(MAX),
    EmbeddingJson NVARCHAR(MAX)
);



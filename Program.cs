USE [ResourcePlanner]
GO
ALTER TABLE [dbo].[PlanSheets] DROP CONSTRAINT [FK_PlanSheets_Plans]
GO
ALTER TABLE [dbo].[PlanSheets] DROP CONSTRAINT [FK_PlanSheets_Lobs]
GO
ALTER TABLE [dbo].[LOBs] DROP CONSTRAINT [FK__LOBs__PlanId__49C3F6B7]
GO
ALTER TABLE [dbo].[PlanSheets] DROP CONSTRAINT [DF__PlanSheet__Creat__6C190EBB]
GO
ALTER TABLE [dbo].[Plans] DROP CONSTRAINT [DF__Plans__CreatedAt__46E78A0C]
GO
/****** Object:  Table [dbo].[QuestionAnswer]    Script Date: 30-07-2025 16:40:13 ******/
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QuestionAnswer]') AND type in (N'U'))
DROP TABLE [dbo].[QuestionAnswer]
GO
/****** Object:  Table [dbo].[PlanSheets]    Script Date: 30-07-2025 16:40:13 ******/
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PlanSheets]') AND type in (N'U'))
DROP TABLE [dbo].[PlanSheets]
GO
/****** Object:  Table [dbo].[Plans]    Script Date: 30-07-2025 16:40:13 ******/
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Plans]') AND type in (N'U'))
DROP TABLE [dbo].[Plans]
GO
/****** Object:  Table [dbo].[LOBs]    Script Date: 30-07-2025 16:40:13 ******/
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LOBs]') AND type in (N'U'))
DROP TABLE [dbo].[LOBs]
GO
/****** Object:  Table [dbo].[LOBs]    Script Date: 30-07-2025 16:40:13 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[LOBs](
	[LOBId] [int] IDENTITY(1,1) NOT NULL,
	[PlanId] [int] NULL,
	[Name] [nvarchar](100) NULL,
	[BillingModel] [nvarchar](50) NULL,
	[ProjectId] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[LOBId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Plans]    Script Date: 30-07-2025 16:40:13 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Plans](
	[PlanId] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](200) NULL,
	[Vertical] [nvarchar](100) NULL,
	[Account] [nvarchar](100) NULL,
	[Geo] [nvarchar](100) NULL,
	[Site] [nvarchar](100) NULL,
	[BusinessUnit] [nvarchar](100) NULL,
	[WeekStart] [nvarchar](10) NULL,
	[PlanFrom] [date] NULL,
	[PlanTo] [date] NULL,
	[SOTracker] [bit] NULL,
	[AssumptionSheet] [bit] NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[PlanId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PlanSheets]    Script Date: 30-07-2025 16:40:13 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PlanSheets](
	[PlanSheetId] [int] IDENTITY(1,1) NOT NULL,
	[PlanId] [int] NOT NULL,
	[LobId] [int] NULL,
	[Name] [nvarchar](100) NOT NULL,
	[Type] [nvarchar](50) NOT NULL,
	[JsonData] [nvarchar](max) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[PlanSheetId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[QuestionAnswer]    Script Date: 30-07-2025 16:40:13 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[QuestionAnswer](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[QuestionText] [nvarchar](max) NULL,
	[AnswerText] [nvarchar](max) NULL,
	[EmbeddingJson] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
ALTER TABLE [dbo].[Plans] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[PlanSheets] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[LOBs]  WITH CHECK ADD FOREIGN KEY([PlanId])
REFERENCES [dbo].[Plans] ([PlanId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[PlanSheets]  WITH CHECK ADD  CONSTRAINT [FK_PlanSheets_Lobs] FOREIGN KEY([LobId])
REFERENCES [dbo].[LOBs] ([LOBId])
GO
ALTER TABLE [dbo].[PlanSheets] CHECK CONSTRAINT [FK_PlanSheets_Lobs]
GO
ALTER TABLE [dbo].[PlanSheets]  WITH CHECK ADD  CONSTRAINT [FK_PlanSheets_Plans] FOREIGN KEY([PlanId])
REFERENCES [dbo].[Plans] ([PlanId])
GO
ALTER TABLE [dbo].[PlanSheets] CHECK CONSTRAINT [FK_PlanSheets_Plans]
GO

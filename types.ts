
export interface ArticleLink {
  title: string;
  url: string;
}

export interface NewsSummary {
  title: string;
  summary: string;
  imageUrl: string;
  links: ArticleLink[];
}

export interface AppData {
  summaries: NewsSummary[];
  recommendations: string[];
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      problems: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          description: string;
          status: 'pending' | 'solved' | 'unsolved';
          keywords: string[];
          repository_contents: Json;
          user_id: string | null;
          problem_comments: Database['public']['Tables']['problem_comments']['Row'][];
        };
        Insert: Omit<Database['public']['Tables']['problems']['Row'], 'created_at' | 'updated_at' | 'problem_comments'>;
        Update: Partial<Database['public']['Tables']['problems']['Insert']>;
      };
      problem_comments: {
        Row: {
          id: string;
          created_at: string;
          problem_id: string;
          content: string;
          username: string;
        };
        Insert: Omit<Database['public']['Tables']['problem_comments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['problem_comments']['Insert']>;
      };
    };
  };
}

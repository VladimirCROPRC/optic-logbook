export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      fiber_routes: {
        Row: {
          cable_type: string | null
          created_at: string
          fiber_count: number | null
          id: string
          installation_id: string
          installation_method: string | null
          label: string
          length_m: number | null
          notes: string | null
          path: Json
          updated_at: string
        }
        Insert: {
          cable_type?: string | null
          created_at?: string
          fiber_count?: number | null
          id?: string
          installation_id: string
          installation_method?: string | null
          label: string
          length_m?: number | null
          notes?: string | null
          path?: Json
          updated_at?: string
        }
        Update: {
          cable_type?: string | null
          created_at?: string
          fiber_count?: number | null
          id?: string
          installation_id?: string
          installation_method?: string | null
          label?: string
          length_m?: number | null
          notes?: string | null
          path?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiber_routes_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
        ]
      }
      installations: {
        Row: {
          address: string | null
          client_name: string
          contact_person: string | null
          contact_phone: string | null
          cpe_mac: string | null
          cpe_model: string | null
          cpe_serial: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          media_converter_installed: boolean
          media_converter_model: string | null
          media_converter_serial: string | null
          notes: string | null
          odf_name: string | null
          odf_port: string | null
          patch_cord_type: string | null
          rx_power_dbm: number | null
          service_package: string | null
          sfp_installed: boolean
          sfp_model: string | null
          sfp_serial: string | null
          sfp_wavelength: string | null
          site_name: string | null
          status: string
          switch_name: string | null
          switch_port: string | null
          terminal_box_installed: boolean
          terminal_box_ports: number | null
          terminal_box_type: string | null
          tx_power_dbm: number | null
          updated_at: string
          user_id: string
          vlan: string | null
          work_order: string | null
        }
        Insert: {
          address?: string | null
          client_name: string
          contact_person?: string | null
          contact_phone?: string | null
          cpe_mac?: string | null
          cpe_model?: string | null
          cpe_serial?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          media_converter_installed?: boolean
          media_converter_model?: string | null
          media_converter_serial?: string | null
          notes?: string | null
          odf_name?: string | null
          odf_port?: string | null
          patch_cord_type?: string | null
          rx_power_dbm?: number | null
          service_package?: string | null
          sfp_installed?: boolean
          sfp_model?: string | null
          sfp_serial?: string | null
          sfp_wavelength?: string | null
          site_name?: string | null
          status?: string
          switch_name?: string | null
          switch_port?: string | null
          terminal_box_installed?: boolean
          terminal_box_ports?: number | null
          terminal_box_type?: string | null
          tx_power_dbm?: number | null
          updated_at?: string
          user_id: string
          vlan?: string | null
          work_order?: string | null
        }
        Update: {
          address?: string | null
          client_name?: string
          contact_person?: string | null
          contact_phone?: string | null
          cpe_mac?: string | null
          cpe_model?: string | null
          cpe_serial?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          media_converter_installed?: boolean
          media_converter_model?: string | null
          media_converter_serial?: string | null
          notes?: string | null
          odf_name?: string | null
          odf_port?: string | null
          patch_cord_type?: string | null
          rx_power_dbm?: number | null
          service_package?: string | null
          sfp_installed?: boolean
          sfp_model?: string | null
          sfp_serial?: string | null
          sfp_wavelength?: string | null
          site_name?: string | null
          status?: string
          switch_name?: string | null
          switch_port?: string | null
          terminal_box_installed?: boolean
          terminal_box_ports?: number | null
          terminal_box_type?: string | null
          tx_power_dbm?: number | null
          updated_at?: string
          user_id?: string
          vlan?: string | null
          work_order?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      speed_tests: {
        Row: {
          created_at: string
          download_mbps: number | null
          id: string
          installation_id: string
          jitter_ms: number | null
          latency_ms: number | null
          notes: string | null
          packet_loss_pct: number | null
          passed: boolean
          service_name: string
          tested_at: string
          upload_mbps: number | null
        }
        Insert: {
          created_at?: string
          download_mbps?: number | null
          id?: string
          installation_id: string
          jitter_ms?: number | null
          latency_ms?: number | null
          notes?: string | null
          packet_loss_pct?: number | null
          passed?: boolean
          service_name: string
          tested_at?: string
          upload_mbps?: number | null
        }
        Update: {
          created_at?: string
          download_mbps?: number | null
          id?: string
          installation_id?: string
          jitter_ms?: number | null
          latency_ms?: number | null
          notes?: string | null
          packet_loss_pct?: number | null
          passed?: boolean
          service_name?: string
          tested_at?: string
          upload_mbps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "speed_tests_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
        ]
      }
      splice_closures: {
        Row: {
          closure_type: string | null
          created_at: string
          id: string
          installation_id: string
          latitude: number | null
          location_note: string | null
          longitude: number | null
          name: string
          updated_at: string
        }
        Insert: {
          closure_type?: string | null
          created_at?: string
          id?: string
          installation_id: string
          latitude?: number | null
          location_note?: string | null
          longitude?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          closure_type?: string | null
          created_at?: string
          id?: string
          installation_id?: string
          latitude?: number | null
          location_note?: string | null
          longitude?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "splice_closures_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
        ]
      }
      splices: {
        Row: {
          closure_id: string
          created_at: string
          id: string
          in_fiber_color: string | null
          in_tube_color: string | null
          loss_db: number | null
          notes: string | null
          out_fiber_color: string | null
          out_tube_color: string | null
          position_no: number | null
          tray: string | null
        }
        Insert: {
          closure_id: string
          created_at?: string
          id?: string
          in_fiber_color?: string | null
          in_tube_color?: string | null
          loss_db?: number | null
          notes?: string | null
          out_fiber_color?: string | null
          out_tube_color?: string | null
          position_no?: number | null
          tray?: string | null
        }
        Update: {
          closure_id?: string
          created_at?: string
          id?: string
          in_fiber_color?: string | null
          in_tube_color?: string | null
          loss_db?: number | null
          notes?: string | null
          out_fiber_color?: string | null
          out_tube_color?: string | null
          position_no?: number | null
          tray?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "splices_closure_id_fkey"
            columns: ["closure_id"]
            isOneToOne: false
            referencedRelation: "splice_closures"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_closure: { Args: { _closure_id: string }; Returns: boolean }
      owns_installation: {
        Args: { _installation_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

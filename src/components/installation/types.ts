import type { Tables } from "@/integrations/supabase/types";

export type Installation = Tables<"installations">;
export type SpeedTest = Tables<"speed_tests">;
export type FiberRoute = Tables<"fiber_routes">;
export type SpliceClosure = Tables<"splice_closures">;
export type Splice = Tables<"splices">;
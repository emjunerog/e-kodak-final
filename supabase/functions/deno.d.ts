declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
  }
}

declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "https://esm.sh/qrcode@1.5.3" {
  const QRCode: any;
  export default QRCode;
}

declare module "https://deno.land/x/smtp@v0.7.0/mod.ts" {
  export class SmtpClient {
    connectTLS(config: any): Promise<void>;
    send(msg: any): Promise<void>;
    close(): Promise<void>;
  }
}

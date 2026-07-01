import { NextRequest, NextResponse } from 'next/server';

let createClientResult = 'not_imported_yet';
try {
  const supabase = require('@supabase/supabase-js');
  createClientResult = 'imported_successfully';
} catch (err: any) {
  createClientResult = 'import_error: ' + err.message;
}

export async function GET(req: NextRequest) {
  const results: Record<string, unknown> = {
    step: 'start',
    import_status: createClientResult
  };

  try {
    results.step = 'env_read';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

    results.step = 'create_client_test';
    if (createClientResult === 'imported_successfully') {
      const { createClient } = require('@supabase/supabase-js');
      try {
        const client = createClient(url, anonKey);
        results.client_created = true;
      } catch (err: any) {
        results.client_created = false;
        results.client_error = err.message;
      }
    }
    results.status = 'success';
  } catch (e: any) {
    results.status = 'error';
    results.error = e.message;
  }

  return NextResponse.json(results, { status: 200 });
}

import { sql } from '@/lib/db/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await sql`SELECT version()`;
  return NextResponse.json({ version: result[0].version });
}
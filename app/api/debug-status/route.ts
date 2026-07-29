import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("=========================================");
    console.log("CLIENT DEBUG BEACON RECEIVED:");
    console.log("Status:", body.status);
    console.log("Session:", body.session);
    console.log("Time:", new Date().toISOString());
    console.log("=========================================");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

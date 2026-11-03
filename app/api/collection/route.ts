import { NextRequest, NextResponse } from 'next/server';
import { loadCollection, requireSession, storageError } from '../../../lib/collectionServer';

export async function GET(req: NextRequest) {
  const auth = requireSession(req);
  if (!auth.ok) return auth.response;
  const collection = await loadCollection(auth.profileId);
  if (!collection) return storageError();
  return NextResponse.json(collection);
}

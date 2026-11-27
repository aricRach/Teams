import {DocumentReference, Firestore, writeBatch} from '@angular/fire/firestore';

/** A Firestore batch holds at most 500 writes. */
const BATCH_LIMIT = 500;

/** Deletes the docs in chunks of 500. Not atomic: a failure can leave earlier chunks deleted. */
export async function deleteInBatches(firestore: Firestore, refs: DocumentReference[]): Promise<void> {
  for (let start = 0; start < refs.length; start += BATCH_LIMIT) {
    const batch = writeBatch(firestore);
    refs.slice(start, start + BATCH_LIMIT).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

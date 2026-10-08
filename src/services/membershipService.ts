import { doc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import type { Membership } from "@/domain/membership";
import { membershipDocumentId } from "@/domain/membership";
import { db } from "@/lib/firebase";

export async function resolveMembership(tenantId: string, userId: string): Promise<Membership | null> {
  const ref = doc(db, "memberships", membershipDocumentId(tenantId, userId));
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return { id: snapshot.id, ...data } as Membership;
}

export function watchMembership(
  tenantId: string,
  userId: string,
  onValue: (membership: Membership | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const ref = doc(db, "memberships", membershipDocumentId(tenantId, userId));
  return onSnapshot(ref, (snapshot) => {
    onValue(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Membership : null);
  }, (error) => onError(error));
}

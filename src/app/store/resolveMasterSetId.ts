import { NEW_MASTER_SET_VALUE } from "./MasterSetSelect";
import { createMasterSetForPurchase } from "./actions";

// Shared by all three purchase forms: if the user picked "+ Create new
// master set", create it now and use its id; otherwise the existing
// selection is already a real id.
export async function resolveMasterSetId(
  masterSetId: string,
  newName: string
): Promise<{ id: string } | { error: string }> {
  if (masterSetId !== NEW_MASTER_SET_VALUE) return { id: masterSetId };
  return createMasterSetForPurchase(newName);
}

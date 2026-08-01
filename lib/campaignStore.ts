import type { CampaignState } from '@/types';

// ---------------------------------------------------------------------------
// There is no database in this project by design. Campaign state (uploaded
// rows, validation results, send results) lives only in server memory for
// the lifetime of the process, keyed by a campaign id. This is sufficient
// for 2-3 internal users running one campaign at a time.
//
// We attach the store to `globalThis` so it survives Next.js dev-mode
// module reloads (otherwise every file edit would wipe in-flight state).
// ---------------------------------------------------------------------------

const MAX_CAMPAIGN_AGE_MS = 1000 * 60 * 60 * 6; // 6 hours

class CampaignStore {
  private campaigns = new Map<string, CampaignState>();

  create(id: string, rows: CampaignState['rows']): CampaignState {
    this.evictStale();
    const state: CampaignState = {
      id,
      createdAt: Date.now(),
      rows,
      validationResults: null,
      sendResults: null,
      sending: false,
      reportPaths: null,
    };
    this.campaigns.set(id, state);
    return state;
  }

  get(id: string): CampaignState | undefined {
    return this.campaigns.get(id);
  }

  update(id: string, patch: Partial<CampaignState>): CampaignState {
    const existing = this.campaigns.get(id);
    if (!existing) {
      throw new Error('Campaign not found. Please upload the file again.');
    }
    const updated = { ...existing, ...patch };
    this.campaigns.set(id, updated);
    return updated;
  }

  private evictStale() {
    const now = Date.now();
    for (const [id, state] of this.campaigns.entries()) {
      if (now - state.createdAt > MAX_CAMPAIGN_AGE_MS) {
        this.campaigns.delete(id);
      }
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __campaignStore: CampaignStore | undefined;
}

export const campaignStore = globalThis.__campaignStore ?? new CampaignStore();
globalThis.__campaignStore = campaignStore;

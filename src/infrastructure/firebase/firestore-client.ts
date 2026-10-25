import { fromFields, toFields, type FirestoreFields } from './firestore-values';
import { getAccessToken, type ServiceAccount } from './service-account';

export interface FirestoreConfig extends ServiceAccount {
  projectId: string;
}

interface RawDocument {
  name: string;
  fields?: FirestoreFields;
}

export interface StoredDocument {
  id: string;
  data: Record<string, unknown>;
}

/** The handful of Firestore REST calls the site needs. */
export class FirestoreClient {
  readonly #base: string;
  readonly #config: FirestoreConfig;

  constructor(config: FirestoreConfig) {
    this.#config = config;
    this.#base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/databases/(default)/documents`;
  }

  async #request(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await getAccessToken(this.#config);
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body) headers.set('Content-Type', 'application/json');
    return fetch(`${this.#base}/${path}`, { ...init, headers });
  }

  static #toDocument(raw: RawDocument): StoredDocument {
    return { id: raw.name.slice(raw.name.lastIndexOf('/') + 1), data: fromFields(raw.fields ?? {}) };
  }

  async get(collection: string, id: string): Promise<StoredDocument | undefined> {
    const response = await this.#request(`${collection}/${encodeURIComponent(id)}`);
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`Firestore get ${collection}/${id} failed with ${response.status}`);
    return FirestoreClient.#toDocument((await response.json()) as RawDocument);
  }

  async list(collection: string): Promise<StoredDocument[]> {
    const documents: StoredDocument[] = [];
    let pageToken: string | undefined;
    do {
      const query = new URLSearchParams({ pageSize: '300' });
      if (pageToken) query.set('pageToken', pageToken);
      const response = await this.#request(`${collection}?${query}`);
      if (!response.ok) throw new Error(`Firestore list ${collection} failed with ${response.status}`);
      const page = (await response.json()) as { documents?: RawDocument[]; nextPageToken?: string };
      documents.push(...(page.documents ?? []).map(FirestoreClient.#toDocument));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return documents;
  }

  /** Creates the document or replaces all of its fields. */
  async set(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
    const response = await this.#request(`${collection}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: toFields(data) }),
    });
    if (!response.ok) throw new Error(`Firestore set ${collection}/${id} failed with ${response.status}`);
  }

  async delete(collection: string, id: string): Promise<void> {
    const response = await this.#request(`${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Firestore delete ${collection}/${id} failed with ${response.status}`);
    }
  }
}

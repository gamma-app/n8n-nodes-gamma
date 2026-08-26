import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
} from 'n8n-workflow';

const BASE_URL = 'https://public-api.gamma.app';

/**
 * Backs the Theme and Folder pickers. Both endpoints share a shape:
 * `{ data: [{ id, name, ... }], hasMore, nextCursor }`, with `query` for search
 * and `after` for the cursor. Gamma caps `limit` at 50.
 */
async function searchWorkspaceResource(
	this: ILoadOptionsFunctions,
	url: string,
	filter?: string,
	paginationToken?: string,
	describe?: (item: IDataObject) => string | undefined,
): Promise<INodeListSearchResult> {
	const qs: IDataObject = { limit: 50 };
	if (filter) qs.query = filter;
	if (paginationToken) qs.after = paginationToken;

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'gammaApi', {
		method: 'GET',
		baseURL: BASE_URL,
		url,
		qs,
		json: true,
	})) as { data?: IDataObject[]; nextCursor?: string | null };

	return {
		results: (response.data ?? []).map((item) => ({
			name: (item.name as string) ?? (item.id as string),
			value: item.id as string,
			description: describe?.(item),
		})),
		// n8n stops paging when this is undefined; the API sends null at the end.
		paginationToken: response.nextCursor ?? undefined,
	};
}

/** Backs the Theme and Folder resource-locator pickers. */
export const listSearch = {

	async searchThemes(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		return await searchWorkspaceResource.call(
			this,
			'/v1.0/themes',
			filter,
			paginationToken,
			(item) => (item.type === 'custom' ? 'Custom workspace theme' : 'Standard theme'),
		);
	},

	async searchFolders(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		return await searchWorkspaceResource.call(this, '/v1.0/folders', filter, paginationToken);
	},
};

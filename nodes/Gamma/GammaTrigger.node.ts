import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';

import { BASE_URL, USER_AGENT } from './api';
import { listSearch } from './methods/listSearch';
import {
	chronological,
	commentEvents,
	gammaEvents,
	type CommentEvent,
	type TriggerEvent,
} from './trigger/events';
import { PollTracker, isCurrent, queryFrom, type PollState } from './trigger/state';

/** Comment threads per page; the API maximum. */
const COMMENT_PAGE_SIZE = 50;
/** Search hits per request; the API maximum. Search has no cursor. */
const SEARCH_PAGE_SIZE = 25;
/** Upper bound on requests in one poll, so a burst of activity cannot run away. */
const MAX_REQUESTS_PER_POLL = 20;

type Event = 'comment' | 'gammaUpdated';

interface CommentsPage {
	data?: IDataObject[];
	hasMore?: boolean;
	nextCursor?: string | null;
}

interface SearchPage {
	hits?: IDataObject[];
}

export class GammaTrigger implements INodeType {
	methods = { listSearch };

	description: INodeTypeDescription = {
		displayName: 'Gamma Trigger',
		name: 'gammaTrigger',
		icon: { light: 'file:gamma.svg', dark: 'file:gamma.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle:
			'={{$parameter["event"] === "comment" ? "Comment activity" : "Gamma created or updated"}}',
		description: 'Starts the workflow when someone comments on a Gamma or a Gamma changes',
		defaults: {
			name: 'Gamma Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'gammaApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Comment Activity',
						value: 'comment',
						description:
							'A comment or reply is added to a Gamma, or a comment is resolved, reopened or edited',
					},
					{
						name: 'Gamma Created or Updated',
						value: 'gammaUpdated',
						description: 'A Gamma you can access is created or edited',
					},
				],
				default: 'comment',
			},
			// Comment activity
			{
				displayName: 'Gamma',
				name: 'gammaId',
				type: 'resourceLocator',
				required: true,
				default: { mode: 'list', value: '' },
				description: 'The Gamma to watch for comments',
				displayOptions: { show: { event: ['comment'] } },
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchGammas',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. g_l0mf2jvf1fpmi1v',
					},
				],
			},
			{
				displayName: 'Trigger On',
				name: 'commentEvents',
				type: 'multiOptions',
				required: true,
				options: [
					{
						name: 'Comment Updated',
						value: 'commentUpdated',
						description: 'A comment is resolved, reopened, edited or archived',
					},
					{
						name: 'New Comment',
						value: 'commentCreated',
						description: 'Someone starts a new comment thread',
					},
					{
						name: 'New Reply',
						value: 'replyCreated',
						description: 'Someone replies in an existing thread',
					},
				],
				default: ['commentCreated', 'replyCreated'],
				displayOptions: { show: { event: ['comment'] } },
			},
			{
				displayName: 'Options',
				name: 'commentOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: { show: { event: ['comment'] } },
				options: [
					{
						displayName: 'Include Archived',
						name: 'includeArchived',
						type: 'boolean',
						default: false,
						description:
							'Whether to also report activity on archived (deleted) comments and replies',
					},
					{
						displayName: 'Simplify',
						name: 'simplify',
						type: 'boolean',
						default: true,
						description:
							'Whether to return a simplified version of the response instead of the raw data',
					},
				],
			},
			// Gamma created or updated
			{
				displayName:
					'Fires once for each saved version a poll sees, so a Gamma someone is actively editing can fire on several polls in a row',
				name: 'gammaUpdatedNotice',
				type: 'notice',
				default: '',
				displayOptions: { show: { event: ['gammaUpdated'] } },
			},
			{
				displayName: 'Filters',
				name: 'gammaFilters',
				type: 'collection',
				placeholder: 'Add filter',
				default: {},
				displayOptions: { show: { event: ['gammaUpdated'] } },
				options: [
					{
						displayName: 'Created By',
						name: 'createdBy',
						type: 'string',
						default: '',
						placeholder: 'e.g. me',
						description: 'Only Gammas created by this user: me, an email address, or a user ID',
					},
					{
						displayName: 'Include Archived',
						name: 'includeArchived',
						type: 'boolean',
						default: false,
						description: 'Whether to also report archived Gammas',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event') as Event;
		const manual = this.getMode() === 'manual';
		// Called when a poll reaches its request cap with more left to read. The
		// APIs return newest first, so what is left is older than everything read;
		// re-reading the window next time would hit the same cap, so the poll moves
		// on and says so.
		const capped = (what: string) =>
			this.logger.warn(
				`Gamma Trigger read ${what} in one poll and stopped; older changes in this interval were skipped. Poll more often to avoid this.`,
			);

		let scope: string;
		// Reads everything changed since `from`, in at most `maxRequests` requests.
		let fetchSince: (
			from: number,
			tracker: PollTracker,
			maxRequests: number,
		) => Promise<TriggerEvent[]>;
		let wanted: (e: TriggerEvent) => boolean;

		if (event === 'comment') {
			const gammaId = (
				this.getNodeParameter('gammaId', undefined, {
					extractValue: true,
				}) as string
			).trim();
			if (!gammaId) {
				throw new NodeOperationError(this.getNode(), 'No Gamma selected', {
					description: 'Choose the Gamma to watch for comments.',
				});
			}
			const subscribed = this.getNodeParameter('commentEvents', []) as CommentEvent[];
			const options = this.getNodeParameter('commentOptions', {}) as IDataObject;
			const includeArchived = options.includeArchived === true;
			const simplify = options.simplify !== false;

			scope = `comment:${gammaId}:${includeArchived}`;
			wanted = (e) => subscribed.includes(e.event as CommentEvent);
			fetchSince = async (from, tracker, maxRequests) => {
				const events: TriggerEvent[] = [];
				let after: string | undefined;
				for (let i = 0; ; i++) {
					const qs: IDataObject = {
						limit: COMMENT_PAGE_SIZE,
						updatedSince: new Date(from).toISOString(),
					};
					if (includeArchived) qs.includeArchived = true;
					if (after) qs.after = after;
					const page = (await request.call(this, {
						method: 'GET',
						url: `/v1.0/gammas/${encodeURIComponent(gammaId)}/comments`,
						qs,
					})) as CommentsPage;
					events.push(...commentEvents(page.data ?? [], gammaId, from, tracker, simplify));
					if (!page.hasMore || !page.nextCursor) break;
					if (i + 1 >= maxRequests) {
						if (maxRequests > 1) capped(`${maxRequests * COMMENT_PAGE_SIZE} comment threads`);
						break;
					}
					after = page.nextCursor;
				}
				return events;
			};
		} else {
			const filters = this.getNodeParameter('gammaFilters', {}) as IDataObject;
			const createdBy = typeof filters.createdBy === 'string' ? filters.createdBy.trim() : '';
			const includeArchived = filters.includeArchived === true;

			scope = `gammaUpdated:${createdBy}:${includeArchived}`;
			wanted = () => true;
			fetchSince = async (from, tracker, maxRequests) => {
				// Without a query, search returns the most recently updated Gammas
				// first, 25 at a time, with no cursor. To read more than 25, walk the
				// window backwards: the next request ends where the oldest hit of this
				// one starts. Both bounds are inclusive; the tracker drops repeats.
				const hits: IDataObject[] = [];
				let before: string | undefined;
				for (let i = 0; ; i++) {
					const qs: IDataObject = {
						limit: SEARCH_PAGE_SIZE,
						updatedAfter: new Date(from).toISOString(),
					};
					if (before) qs.updatedBefore = before;
					if (createdBy) qs.createdBy = createdBy;
					if (includeArchived) qs.includeArchived = true;
					const page = (await request.call(this, {
						method: 'GET',
						url: '/v1.0/gammas/search',
						qs,
					})) as SearchPage;
					const batch = page.hits ?? [];
					hits.push(...batch);
					if (batch.length < SEARCH_PAGE_SIZE) break;
					const oldest = oldestUpdatedTime(batch);
					// More than a page shares one timestamp: there is no way to move the window.
					if (!oldest || oldest === before) break;
					if (i + 1 >= maxRequests) {
						if (maxRequests > 1) capped(`${maxRequests * SEARCH_PAGE_SIZE} Gammas`);
						break;
					}
					before = oldest;
				}
				return gammaEvents(hits, tracker);
			};
		}

		if (manual) {
			// "Fetch test event": show the most recent activity without touching
			// the state an active workflow depends on.
			const sample: PollState = {
				scope,
				since: Date.now() - 30 * 24 * 60 * 60 * 1000,
				seen: {},
			};
			const events = chronological(await fetchSince(queryFrom(sample), new PollTracker(sample), 1));
			const latest = events.filter(wanted).pop();
			if (!latest) {
				throw new NodeOperationError(this.getNode(), 'No matching activity in the last 30 days', {
					description:
						event === 'comment'
							? 'Add a comment to the Gamma, then fetch a test event again.'
							: 'Edit a Gamma you can access, then fetch a test event again.',
				});
			}
			return [[{ json: latest.json }]];
		}

		const staticData = this.getWorkflowStaticData('node');
		const stored = staticData.pollState;

		if (!isCurrent(stored, scope)) {
			// First poll, or the Gamma or filters changed. Record what already exists
			// without emitting it, so activating the workflow doesn't replay history.
			const fresh: PollState = { scope, since: Date.now(), seen: {} };
			const tracker = new PollTracker(fresh);
			await fetchSince(queryFrom(fresh), tracker, MAX_REQUESTS_PER_POLL);
			staticData.pollState = tracker.next() as unknown as IDataObject;
			return null;
		}

		const tracker = new PollTracker(stored);
		const events = chronological(
			await fetchSince(queryFrom(stored), tracker, MAX_REQUESTS_PER_POLL),
		).filter(wanted);
		staticData.pollState = tracker.next() as unknown as IDataObject;

		if (events.length === 0) return null;
		return [events.map((e) => ({ json: e.json }))];
	}
}

async function request(
	this: IPollFunctions,
	options: Partial<IHttpRequestOptions>,
): Promise<unknown> {
	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'gammaApi', {
			baseURL: BASE_URL,
			json: true,
			headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
			...options,
		} as IHttpRequestOptions);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/** The earliest updatedTime in a batch of search hits, as the API sent it. */
function oldestUpdatedTime(hits: IDataObject[]): string | undefined {
	let oldest: string | undefined;
	let oldestMs = Number.POSITIVE_INFINITY;
	for (const hit of hits) {
		const value = hit.updatedTime;
		if (typeof value !== 'string') continue;
		const ms = Date.parse(value);
		if (!Number.isNaN(ms) && ms < oldestMs) {
			oldestMs = ms;
			oldest = value;
		}
	}
	return oldest;
}

import type { IDataObject } from 'n8n-workflow';

import { PollTracker, toMs } from './state';

/** The comment events a user can subscribe to. */
export type CommentEvent = 'commentCreated' | 'replyCreated' | 'commentUpdated';

export const COMMENT_EVENTS: readonly CommentEvent[] = [
	'commentCreated',
	'replyCreated',
	'commentUpdated',
];

/** One thing that happened, in the order it happened. */
export interface TriggerEvent {
	event: CommentEvent | 'gammaUpdated';
	/** When it happened, for ordering the output oldest first. */
	at: number;
	json: IDataObject;
}

interface Author {
	id?: string;
	name?: string | null;
}

const authorFields = (author: unknown) => {
	const a = (author ?? {}) as Author;
	return { authorId: a.id ?? null, authorName: a.name ?? null };
};

/**
 * Turns comment threads returned by `updatedSince` into events.
 *
 * The API returns a thread whenever anything on it changes, so one thread can
 * stand for several things: it was created, someone replied, or it was edited,
 * resolved, reopened or archived. Each thread is split into:
 *
 * - `commentCreated` if the thread itself was created inside the read window
 *   and has not been reported before;
 * - one `replyCreated` per reply created inside the window and not reported;
 * - `commentUpdated` if the thread changed but neither of the above explains it.
 *
 * Every event is marked in `tracker` even when the user did not subscribe to
 * it, so switching events on later does not replay old activity.
 */
export function commentEvents(
	threads: IDataObject[],
	gammaId: string,
	from: number,
	tracker: PollTracker,
	simplify: boolean,
): TriggerEvent[] {
	const events: TriggerEvent[] = [];

	for (const thread of threads) {
		const id = thread.id as string;
		const updated = toMs(thread.updatedTime);
		if (!id || updated === undefined) continue;
		tracker.advance(updated);

		// The same thread at the same updatedTime has already been handled.
		if (!tracker.mark(`u:${id}@${thread.updatedTime as string}`, updated)) continue;

		const before = events.length;
		const created = toMs(thread.createdTime);
		if (created !== undefined && created >= from && tracker.mark(`c:${id}`, created)) {
			events.push({
				event: 'commentCreated',
				at: created,
				json: simplify
					? simplifyThread('commentCreated', gammaId, thread)
					: { event: 'commentCreated', gammaId, comment: thread },
			});
		}

		const replies = Array.isArray(thread.replies) ? (thread.replies as IDataObject[]) : [];
		for (const reply of replies) {
			const replyCreated = toMs(reply.createdTime);
			if (!reply.id || replyCreated === undefined || replyCreated < from) continue;
			if (!tracker.mark(`r:${reply.id as string}`, replyCreated)) continue;
			events.push({
				event: 'replyCreated',
				at: replyCreated,
				json: simplify
					? simplifyReply(gammaId, thread, reply)
					: { event: 'replyCreated', gammaId, comment: thread, reply },
			});
		}

		if (events.length === before) {
			events.push({
				event: 'commentUpdated',
				at: updated,
				json: simplify
					? simplifyThread('commentUpdated', gammaId, thread)
					: { event: 'commentUpdated', gammaId, comment: thread },
			});
		}
	}

	return events;
}

function simplifyThread(event: CommentEvent, gammaId: string, thread: IDataObject): IDataObject {
	const replies = Array.isArray(thread.replies) ? thread.replies : [];
	return {
		event,
		gammaId,
		commentId: thread.id ?? null,
		cardId: thread.cardId ?? null,
		status: thread.status ?? null,
		archived: thread.archived ?? false,
		targetText: thread.targetText ?? null,
		contentText: thread.contentText ?? null,
		...authorFields(thread.author),
		mentionedUsers: thread.mentionedUsers ?? [],
		replyCount: replies.length,
		createdTime: thread.createdTime ?? null,
		updatedTime: thread.updatedTime ?? null,
	};
}

function simplifyReply(gammaId: string, thread: IDataObject, reply: IDataObject): IDataObject {
	return {
		event: 'replyCreated',
		gammaId,
		commentId: thread.id ?? null,
		replyId: reply.id ?? null,
		cardId: thread.cardId ?? null,
		status: thread.status ?? null,
		archived: reply.archived ?? false,
		targetText: thread.targetText ?? null,
		contentText: reply.contentText ?? null,
		...authorFields(reply.author),
		mentionedUsers: reply.mentionedUsers ?? [],
		// The comment being replied to, so a workflow can quote it without a second call.
		threadContentText: thread.contentText ?? null,
		threadAuthorName: authorFields(thread.author).authorName,
		createdTime: reply.createdTime ?? null,
		updatedTime: reply.updatedTime ?? null,
	};
}

/**
 * Turns gamma search hits into `gammaUpdated` events. A hit has no creation
 * time, so a new gamma and an edited one look the same; each distinct
 * `updatedTime` of a gamma fires once.
 */
export function gammaEvents(hits: IDataObject[], tracker: PollTracker): TriggerEvent[] {
	const events: TriggerEvent[] = [];
	for (const hit of hits) {
		const id = hit.id as string;
		const updated = toMs(hit.updatedTime);
		if (!id || updated === undefined) continue;
		tracker.advance(updated);
		if (!tracker.mark(`g:${id}@${hit.updatedTime as string}`, updated)) continue;
		events.push({
			event: 'gammaUpdated',
			at: updated,
			json: {
				event: 'gammaUpdated',
				gammaId: id,
				title: hit.title ?? null,
				url: hit.url ?? null,
				createdBy: hit.createdBy ?? null,
				archived: hit.archived ?? false,
				updatedTime: hit.updatedTime,
			},
		});
	}
	return events;
}

/** Oldest first, so downstream nodes see activity in the order it happened. */
export function chronological(events: TriggerEvent[]): TriggerEvent[] {
	return events
		.map((e, i) => ({ e, i }))
		.sort((a, b) => a.e.at - b.e.at || a.i - b.i)
		.map(({ e }) => e);
}

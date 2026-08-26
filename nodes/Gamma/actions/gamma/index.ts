import type { INodeProperties } from 'n8n-workflow';

import { gammaOperations } from './Gamma.resource';
import { gammaExportDescription } from './export.operation';
import { gammaGetDescription } from './get.operation';

// Archive and Delete need no parameters beyond the Gamma ID, so they have no
// operation file of their own.
export const gammaDescription: INodeProperties[] = [
	...gammaOperations,
	...gammaExportDescription,
	...gammaGetDescription,
];

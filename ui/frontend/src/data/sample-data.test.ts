import {describe, expect, it} from 'vitest';
import {companies, workers} from './sample-data';

describe('sample data', () => {
  it('matches the product sanity counts', () => {
    expect(companies).toHaveLength(5);
    expect(workers).toHaveLength(152);
    expect(workers.filter((worker) => worker.status === 'active')).toHaveLength(148);
    expect(workers.filter((worker) => worker.status === 'active' && worker.companyId === null)).toHaveLength(2);
    expect(workers.filter((worker) => worker.pfStatus === 'pending')).toHaveLength(15);
  });
});

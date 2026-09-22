import type {EditorialSql} from '../lib/editorial-email-review';
export function claimCloudImage(sql:EditorialSql,input:{articleId:string;prompt:string;model:string}):Promise<string|null>;
export function recordCloudImageHold(sql:EditorialSql,articleId:string,reason:string,leaseToken?:string|null,retryable?:boolean):Promise<void>;

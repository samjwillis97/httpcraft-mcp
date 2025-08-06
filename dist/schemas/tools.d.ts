/**
 * Zod Validation Schemas for HTTPCraft MCP Tools
 */
import { z } from 'zod';
/**
 * Common schemas used across tools
 */
export declare const HttpMethodSchema: z.ZodEnum<["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]>;
export declare const UrlSchema: z.ZodString;
export declare const HeadersSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
export declare const ConfigPathSchema: z.ZodOptional<z.ZodString>;
export declare const VariablesSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
/**
 * Schema for httpcraft_execute_api tool
 */
export declare const ExecuteApiSchema: z.ZodObject<{
    api: z.ZodString;
    endpoint: z.ZodString;
    profile: z.ZodString;
    environment: z.ZodOptional<z.ZodString>;
    variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    configPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    api: string;
    endpoint: string;
    profile: string;
    timeout?: number | undefined;
    environment?: string | undefined;
    variables?: Record<string, any> | undefined;
    configPath?: string | undefined;
}, {
    api: string;
    endpoint: string;
    profile: string;
    timeout?: number | undefined;
    environment?: string | undefined;
    variables?: Record<string, any> | undefined;
    configPath?: string | undefined;
}>;
/**
 * Schema for httpcraft_execute_request tool
 */
export declare const ExecuteRequestSchema: z.ZodObject<{
    method: z.ZodEnum<["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]>;
    url: z.ZodString;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    body: z.ZodOptional<z.ZodString>;
    profile: z.ZodOptional<z.ZodString>;
    variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    configPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    followRedirects: z.ZodOptional<z.ZodBoolean>;
    maxRedirects: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
    url: string;
    timeout?: number | undefined;
    profile?: string | undefined;
    variables?: Record<string, any> | undefined;
    configPath?: string | undefined;
    headers?: Record<string, string> | undefined;
    body?: string | undefined;
    followRedirects?: boolean | undefined;
    maxRedirects?: number | undefined;
}, {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
    url: string;
    timeout?: number | undefined;
    profile?: string | undefined;
    variables?: Record<string, any> | undefined;
    configPath?: string | undefined;
    headers?: Record<string, string> | undefined;
    body?: string | undefined;
    followRedirects?: boolean | undefined;
    maxRedirects?: number | undefined;
}>;
/**
 * Schema for httpcraft_execute_chain tool
 */
export declare const ExecuteChainSchema: z.ZodObject<{
    chain: z.ZodString;
    profile: z.ZodOptional<z.ZodString>;
    variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    configPath: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
    stopOnFailure: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    chain: string;
    timeout?: number | undefined;
    profile?: string | undefined;
    variables?: Record<string, any> | undefined;
    configPath?: string | undefined;
    stopOnFailure?: boolean | undefined;
}, {
    chain: string;
    timeout?: number | undefined;
    profile?: string | undefined;
    variables?: Record<string, any> | undefined;
    configPath?: string | undefined;
    stopOnFailure?: boolean | undefined;
}>;
/**
 * Schema for discovery tools
 */
export declare const ListApisSchema: z.ZodObject<{
    configPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    configPath?: string | undefined;
}, {
    configPath?: string | undefined;
}>;
export declare const ListEndpointsSchema: z.ZodObject<{
    api: z.ZodString;
    configPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    api: string;
    configPath?: string | undefined;
}, {
    api: string;
    configPath?: string | undefined;
}>;
export declare const ListProfilesSchema: z.ZodObject<{
    configPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    configPath?: string | undefined;
}, {
    configPath?: string | undefined;
}>;
export declare const ListChainsSchema: z.ZodObject<{
    configPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    configPath?: string | undefined;
}, {
    configPath?: string | undefined;
}>;
/**
 * Schema for health check tool
 */
export declare const HealthCheckSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
/**
 * Response schemas for type safety
 */
export declare const HttpCraftResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    statusCode: z.ZodOptional<z.ZodNumber>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    data: z.ZodOptional<z.ZodAny>;
    error: z.ZodOptional<z.ZodString>;
    timing: z.ZodOptional<z.ZodObject<{
        total: z.ZodNumber;
        dns: z.ZodOptional<z.ZodNumber>;
        connect: z.ZodOptional<z.ZodNumber>;
        ssl: z.ZodOptional<z.ZodNumber>;
        send: z.ZodOptional<z.ZodNumber>;
        wait: z.ZodOptional<z.ZodNumber>;
        receive: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        total: number;
        dns?: number | undefined;
        connect?: number | undefined;
        ssl?: number | undefined;
        send?: number | undefined;
        wait?: number | undefined;
        receive?: number | undefined;
    }, {
        total: number;
        dns?: number | undefined;
        connect?: number | undefined;
        ssl?: number | undefined;
        send?: number | undefined;
        wait?: number | undefined;
        receive?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    error?: string | undefined;
    data?: any;
    headers?: Record<string, string> | undefined;
    statusCode?: number | undefined;
    timing?: {
        total: number;
        dns?: number | undefined;
        connect?: number | undefined;
        ssl?: number | undefined;
        send?: number | undefined;
        wait?: number | undefined;
        receive?: number | undefined;
    } | undefined;
}, {
    success: boolean;
    error?: string | undefined;
    data?: any;
    headers?: Record<string, string> | undefined;
    statusCode?: number | undefined;
    timing?: {
        total: number;
        dns?: number | undefined;
        connect?: number | undefined;
        ssl?: number | undefined;
        send?: number | undefined;
        wait?: number | undefined;
        receive?: number | undefined;
    } | undefined;
}>;
export declare const ChainResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    steps: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        success: z.ZodBoolean;
        response: z.ZodOptional<z.ZodObject<{
            success: z.ZodBoolean;
            statusCode: z.ZodOptional<z.ZodNumber>;
            headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            data: z.ZodOptional<z.ZodAny>;
            error: z.ZodOptional<z.ZodString>;
            timing: z.ZodOptional<z.ZodObject<{
                total: z.ZodNumber;
                dns: z.ZodOptional<z.ZodNumber>;
                connect: z.ZodOptional<z.ZodNumber>;
                ssl: z.ZodOptional<z.ZodNumber>;
                send: z.ZodOptional<z.ZodNumber>;
                wait: z.ZodOptional<z.ZodNumber>;
                receive: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                total: number;
                dns?: number | undefined;
                connect?: number | undefined;
                ssl?: number | undefined;
                send?: number | undefined;
                wait?: number | undefined;
                receive?: number | undefined;
            }, {
                total: number;
                dns?: number | undefined;
                connect?: number | undefined;
                ssl?: number | undefined;
                send?: number | undefined;
                wait?: number | undefined;
                receive?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            success: boolean;
            error?: string | undefined;
            data?: any;
            headers?: Record<string, string> | undefined;
            statusCode?: number | undefined;
            timing?: {
                total: number;
                dns?: number | undefined;
                connect?: number | undefined;
                ssl?: number | undefined;
                send?: number | undefined;
                wait?: number | undefined;
                receive?: number | undefined;
            } | undefined;
        }, {
            success: boolean;
            error?: string | undefined;
            data?: any;
            headers?: Record<string, string> | undefined;
            statusCode?: number | undefined;
            timing?: {
                total: number;
                dns?: number | undefined;
                connect?: number | undefined;
                ssl?: number | undefined;
                send?: number | undefined;
                wait?: number | undefined;
                receive?: number | undefined;
            } | undefined;
        }>>;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        success: boolean;
        name: string;
        error?: string | undefined;
        response?: {
            success: boolean;
            error?: string | undefined;
            data?: any;
            headers?: Record<string, string> | undefined;
            statusCode?: number | undefined;
            timing?: {
                total: number;
                dns?: number | undefined;
                connect?: number | undefined;
                ssl?: number | undefined;
                send?: number | undefined;
                wait?: number | undefined;
                receive?: number | undefined;
            } | undefined;
        } | undefined;
    }, {
        success: boolean;
        name: string;
        error?: string | undefined;
        response?: {
            success: boolean;
            error?: string | undefined;
            data?: any;
            headers?: Record<string, string> | undefined;
            statusCode?: number | undefined;
            timing?: {
                total: number;
                dns?: number | undefined;
                connect?: number | undefined;
                ssl?: number | undefined;
                send?: number | undefined;
                wait?: number | undefined;
                receive?: number | undefined;
            } | undefined;
        } | undefined;
    }>, "many">;
    failedStep: z.ZodOptional<z.ZodString>;
    totalDuration: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    steps: {
        success: boolean;
        name: string;
        error?: string | undefined;
        response?: {
            success: boolean;
            error?: string | undefined;
            data?: any;
            headers?: Record<string, string> | undefined;
            statusCode?: number | undefined;
            timing?: {
                total: number;
                dns?: number | undefined;
                connect?: number | undefined;
                ssl?: number | undefined;
                send?: number | undefined;
                wait?: number | undefined;
                receive?: number | undefined;
            } | undefined;
        } | undefined;
    }[];
    totalDuration: number;
    failedStep?: string | undefined;
}, {
    success: boolean;
    steps: {
        success: boolean;
        name: string;
        error?: string | undefined;
        response?: {
            success: boolean;
            error?: string | undefined;
            data?: any;
            headers?: Record<string, string> | undefined;
            statusCode?: number | undefined;
            timing?: {
                total: number;
                dns?: number | undefined;
                connect?: number | undefined;
                ssl?: number | undefined;
                send?: number | undefined;
                wait?: number | undefined;
                receive?: number | undefined;
            } | undefined;
        } | undefined;
    }[];
    totalDuration: number;
    failedStep?: string | undefined;
}>;
export declare const DiscoveryResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodAny;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    error?: string | undefined;
    data?: any;
}, {
    success: boolean;
    error?: string | undefined;
    data?: any;
}>;
/**
 * Type exports for TypeScript
 */
export type HttpMethod = z.infer<typeof HttpMethodSchema>;
export type ExecuteApiParams = z.infer<typeof ExecuteApiSchema>;
export type ExecuteRequestParams = z.infer<typeof ExecuteRequestSchema>;
export type ExecuteChainParams = z.infer<typeof ExecuteChainSchema>;
export type ListApisParams = z.infer<typeof ListApisSchema>;
export type ListEndpointsParams = z.infer<typeof ListEndpointsSchema>;
export type ListProfilesParams = z.infer<typeof ListProfilesSchema>;
export type ListChainsParams = z.infer<typeof ListChainsSchema>;
export type HttpCraftResponse = z.infer<typeof HttpCraftResponseSchema>;
export type ChainResponse = z.infer<typeof ChainResponseSchema>;
export type DiscoveryResponse = z.infer<typeof DiscoveryResponseSchema>;
//# sourceMappingURL=tools.d.ts.map
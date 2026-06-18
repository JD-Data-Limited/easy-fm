/**
 * addHeaders adds headers to the inputted request header object
 * @param headers
 */
export function addHeaders (
    req: RequestInit,
    headers: Record<string, string>
) {
    if (!req.headers) {
        req.headers = headers
    }
    else if (req.headers instanceof Headers) {
        for (const key of Object.keys(headers)) {
            req.headers.set(key, headers[key])
        }
    }
    else if (Array.isArray(req.headers)) {
        for (const [key, value] of Object.entries(headers)) {
            req.headers.push([key, value])
        }
    }
    else {
        for (const key of Object.keys(headers)) {
            req.headers[key] = headers[key]
        }
    }
}

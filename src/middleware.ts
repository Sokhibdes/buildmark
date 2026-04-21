import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROUTES = {
	LOGIN: "/login",
	DASHBOARD: "/admin/dashboard",
};

export async function middleware(request: NextRequest) {
	let supabaseResponse = NextResponse.next({ request });
	const applyCookies = (response: NextResponse) => {
		supabaseResponse.cookies.getAll().forEach((cookie) => {
			response.cookies.set(cookie);
		});
		return response;
	};

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(
					cookiesToSet: {
						name: string;
						value: string;
						options?: any;
					}[],
				) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value),
					);
					supabaseResponse = NextResponse.next({ request });
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	const {
		data: { session },
	} = await supabase.auth.getSession();
	const user = session?.user ?? null;
	const hasAuthCookie = request.cookies
		.getAll()
		.some((cookie) => cookie.name.includes("auth-token"));

	const { pathname } = request.nextUrl;

	if (pathname.startsWith("/admin") && !user && !hasAuthCookie) {
		const redirectUrl = new URL(ROUTES.LOGIN, request.url);
		return applyCookies(NextResponse.redirect(redirectUrl));
	}

	if (pathname === ROUTES.LOGIN && user) {
		const redirectUrl = new URL(ROUTES.DASHBOARD, request.url);
		return applyCookies(NextResponse.redirect(redirectUrl));
	}

	if (pathname === "/") {
		if (user) {
			const redirectUrl = new URL(ROUTES.DASHBOARD, request.url);
			return applyCookies(NextResponse.redirect(redirectUrl));
		}
		const redirectUrl = new URL(ROUTES.LOGIN, request.url);
		return applyCookies(NextResponse.redirect(redirectUrl));
	}

	return supabaseResponse;
}

export const config = {
	matcher: ["/", ROUTES.LOGIN, "/admin/:path*"],
};

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@clerk/nextjs";

export default function DebugSyncPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { isSignedIn } = useAuth();

  const testSync = async () => {
    setLoading(true);
    try {
      console.log("[Debug] Manual sync triggered");
      
      const response = await fetch("/api/auth/sync", { method: "POST" });
      const data = await response.json();
      
      console.log("[Debug] Sync response:", data);
      setResult(data);
    } catch (error) {
      console.error("[Debug] Sync error:", error);
      setResult({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  const addSignInParam = () => {
    console.log("[Debug] Adding sign-in parameter to simulate fresh sign-in");
    const newUrl = window.location.pathname + "?from_sign_in=true";
    window.history.pushState({}, '', newUrl);
    window.location.reload(); // Reload to trigger the sync
  };

  const checkUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromSignIn = urlParams.get('from_sign_in');
    console.log("[Debug] URL from_sign_in:", fromSignIn);
    alert(`URL from_sign_in: ${fromSignIn}`);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Sync Debug Page</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Signed In: {isSignedIn ? "✅ Yes" : "❌ No"}</p>
            {!isSignedIn && <p className="text-red-600">Please sign in to test sync</p>}
          </CardContent>
        </Card>

        {isSignedIn && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Manual Sync Test</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={testSync} disabled={loading}>
                  {loading ? "Syncing..." : "Trigger Manual Sync"}
                </Button>
                
                <div className="space-y-2">
                  <Button onClick={addSignInParam} variant="outline">
                    Simulate Fresh Sign-in
                  </Button>
                  <Button onClick={checkUrlParams} variant="outline">
                    Check URL Parameters
                  </Button>
                </div>
                
                {result && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Result:</h3>
                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Check browser console for detailed logs</li>
                  <li>Click "Trigger Manual Sync" to test the sync endpoint</li>
                  <li>Use "Simulate Fresh Sign-in" to test sign-in detection</li>
                  <li>Use "Check URL Parameters" to see current URL state</li>
                  <li>Check server logs for detailed sync process</li>
                  <li>Verify database is updated in Neon dashboard</li>
                </ol>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

(async function protectPrivatePage() {
    const currentPage =
      window.location.pathname.split("/").pop() || "index.html";
  
    // Keep the login page public.
    if (currentPage === "auth.html") {
      return;
    }
  
    if (typeof supabaseClient === "undefined") {
      window.location.replace("auth.html");
      return;
    }
  
    const { data, error } =
      await supabaseClient.auth.getSession();
  
    if (error || !data.session) {
      const returnTo =
        `${window.location.pathname}${window.location.search}`;
  
      window.location.replace(
        `auth.html?returnTo=${encodeURIComponent(returnTo)}`
      );
  
      return;
    }
  
    supabaseClient.auth.onAuthStateChange(
      function (event, session) {
        if (event === "SIGNED_OUT" || !session) {
          window.location.replace("auth.html");
        }
      }
    );
  })();
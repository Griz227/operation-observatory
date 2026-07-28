async function loadSystems() {

            const response = await fetch("/api/Systems");
            const data = await response.json();

            document.getElementById("output").textContent =
                JSON.stringify(data, null, 4);
        }

        loadSystems();
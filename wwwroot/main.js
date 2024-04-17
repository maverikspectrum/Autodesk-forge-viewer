import { initViewer,loadModel } from './viewer.js';



initViewer(document.getElementById('preview')).then(viewer => {
    console.log(viewer,"--->viewer----->")
    const urn = window.location.hash?.substring(1);
    console.log(urn,"----urn-----")
    setupModelSelection(viewer, urn);
    setupModelUpload(viewer);
    setupSearch(viewer); 
    document.getElementById('take-screenshot-with-markup').addEventListener('click', function () {
        snaphotWithMarkup(viewer);
    });
   
    // viewer.loadExtension('Autodesk.AEC.Minimap3DExtension').then(m => {
    //     m.load();
    //     viewer.loadExtension('Autodesk.AEC.LevelsExtension').then(m => {
    //         m.load();
    //         viewer.loadExtension('Autodesk.BimWalk').then(d=> {
    //             console.log(d);
    //             d.activate();
    //         });
    //     });

    // });

    Promise.all([
        viewer.loadExtension('Autodesk.AEC.LevelsExtension', { ifcLevelsEnabled: true }),
        viewer.loadExtension('Autodesk.AEC.Minimap3DExtension'),
        viewer.loadExtension('Autodesk.BimWalk')
    ]).then(extensions => {
        console.log(extensions);
        const bimWalkExtension = extensions.find(ext => ext.id === 'Autodesk.BimWalk');
        if (bimWalkExtension) {
            bimWalkExtension.activate();
        }
    }).catch(error => {
        console.error("Error loading extensions:", error);
    });
});

async function setupModelSelection(viewer, selectedUrn) {
    const dropdown = document.getElementById('models');
    dropdown.innerHTML = '';
    try {
        const resp = await fetch('/api/models');
        console.log(resp);
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const models = await resp.json();
        dropdown.innerHTML = models.map(model => `<option value=${model.urn} ${model.urn === selectedUrn ? 'selected' : ''}>${model.name}</option>`).join('\n');
        dropdown.onchange = () => onModelSelected(viewer, dropdown.value);
        if (dropdown.value) {
            onModelSelected(viewer, dropdown.value);
        }
    } catch (err) {
        alert('Could not list models. See the console for more details.');
        console.error(err);
    }
}

async function setupModelUpload(viewer) {
    const upload = document.getElementById('upload');
    const input = document.getElementById('input');
    const models = document.getElementById('models');
    upload.onclick = () => input.click();
    input.onchange = async () => {
        const file = input.files[0];
        console.log('File selected:', input.files[0]);

        let data = new FormData();
        data.append('model-file', file);
        if (file.name.endsWith('.zip')) { 
            const entrypoint = window.prompt('Please enter the filename of the main design inside the archive.');
            data.append('model-zip-entrypoint', entrypoint);
        }
        upload.setAttribute('disabled', 'true');
        models.setAttribute('disabled', 'true');
        showNotification(`Uploading model <em>${file.name}</em>. Do not reload the page.`);
        try {
            const resp = await fetch('/api/models', { method: 'POST', body: data });
            if (!resp.ok) {
                throw new Error(await resp.text());
            }
            const model = await resp.json();
            console.log('Model uploaded successfully:', model);

            setupModelSelection(viewer, model.urn);
        } catch (err) {
            console.log(err,"--error---");
            alert(`Could not upload model ${file.name}. See the console for more details.`);
            console.error(err);
        } finally {
            clearNotification();
            upload.removeAttribute('disabled');
            models.removeAttribute('disabled');
            input.value = '';
        }
    };
}

async function onModelSelected(viewer, urn) {
    if (window.onModelSelectedTimeout) {
        clearTimeout(window.onModelSelectedTimeout);
        delete window.onModelSelectedTimeout;
    }
    window.location.hash = urn;
    try {
        const resp = await fetch(`/api/models/${urn}/status`);
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const status = await resp.json();
        switch (status.status) {
            case 'n/a':
                showNotification(`Model has not been translated.`);
                break;
            case 'inprogress':
                showNotification(`Model is being translated (${status.progress})...`);
                window.onModelSelectedTimeout = setTimeout(onModelSelected, 5000, viewer, urn);
                break;
            case 'failed':
                showNotification(`Translation failed. <ul>${status.messages.map(msg => `<li>${JSON.stringify(msg)}</li>`).join('')}</ul>`);
                break;
            default:
                clearNotification();
                loadModel(viewer, urn);
                break; 
        }
    } catch (err) {
        alert('Could not load model. See the console for more details.');
        console.error(err);
    }
}

function showNotification(message) {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = `<div class="notification">${message}</div>`;
    overlay.style.display = 'flex';
}

function clearNotification() {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = '';
    overlay.style.display = 'none';
}
function setupSearch(viewer) {
document.getElementById("search").addEventListener("click", function first() {
    viewer.search(
      document.getElementById("filter").value,
      function (dbIDs) {
        viewer.isolate(dbIDs);
        viewer.fitToView(dbIDs);
      }
    );
  });
  
}


async function snaphotWithMarkup(viewer) {
    const canvas = document.createElement('canvas');
    canvas.width = viewer.container.clientWidth;
    canvas.height = viewer.container.clientHeight;
    const ctx = canvas.getContext('2d');
    const screenshot = await new Promise(resolve => {
        viewer.getScreenShot(viewer.container.clientWidth, viewer.container.clientHeight, function (blobURL) {
            const image = new Image();
            image.onload = function () {
                resolve(image);
            };
            image.src = blobURL;
        });
    });
    ctx.drawImage(screenshot, 0, 0, canvas.width, canvas.height);
    var markupSVG = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" baseProfile="full" style="position:absolute; left:0; top:0; transform:scale(1,-1); -ms-transform:scale(1,-1); -webkit-transform:scale(1,-1); -moz-transform:scale(1,-1); -o-transform:scale(1,-1); transformOrigin:0, 0; -ms-transformOrigin:0, 0; -webkit-transformOrigin:0, 0; -moz-transformOrigin:0, 0; -o-transformOrigin:0, 0; " width="510" height="960" viewBox="-531.25 -1000 1062.5 2000" cursor="crosshair" pointer-events="painted"><metadata><markup_document xmlns="http://www.w3.org/1999/xhtml" data-model-version="4"></markup_document></metadata><g cursor="inherit" pointer-events="stroke"><metadata><markup_element xmlns="http://www.w3.org/1999/xhtml" stroke-width="10.416666666666629" stroke-linejoin="miter" stroke-color="#ff0000" stroke-opacity="1" fill-color="#ff0000" fill-opacity="0" type="cloud" position="-48.958333333333336 307.2916666666667" size="418.75 377.08333333333337" rotation="0"></markup_element></metadata><path id="markup" d="M -183.75000000000003 -142.59259259259264 a 20.416666666666668 20.37037037037037 0 1 1 20.416666666666668 -20.37037037037037 c 2.0416666666666674 -23.819444444444446 38.79166666666668 -23.819444444444446 40.83333333333334 0 c 2.0416666666666674 -23.819444444444446 38.79166666666668 -23.819444444444446 40.83333333333334 0 c 2.0416666666666674 -23.819444444444446 38.79166666666668 -23.819444444444446 40.83333333333334 0 c 2.0416666666666674 -23.819444444444446 38.79166666666668 -23.819444444444446 40.83333333333334 0 c 2.0416666666666674 -23.819444444444446 38.79166666666668 -23.819444444444446 40.83333333333334 0 c 2.0416666666666674 -23.819444444444446 38.79166666666668 -23.819444444444446 40.83333333333334 0 c 2.0416666666666674 -23.819444444444446 38.79166666666668 -23.819444444444446 40.83333333333334 0 c 2.0416666666666674 -23.819444444444446 38.79166666666668 -23.819444444444446 40.83333333333334 0 a 20.416666666666668 20.37037037037037 0 1 1 20.416666666666668 20.37037037037037 c 23.76543209876543 2.037037037037037 23.76543209876543 38.7037037037037 0 40.74074074074074 c 23.76543209876543 2.037037037037037 23.76543209876543 38.7037037037037 0 40.74074074074074 c 23.76543209876543 2.037037037037037 23.76543209876543 38.7037037037037 0 40.74074074074074 c 23.76543209876543 2.037037037037037 23.76543209876543 38.7037037037037 0 40.74074074074074 c 23.76543209876543 2.037037037037037 23.76543209876543 38.7037037037037 0 40.74074074074074 c 23.76543209876543 2.037037037037037 23.76543209876543 38.7037037037037 0 40.74074074074074 c 23.76543209876543 2.037037037037037 23.76543209876543 38.7037037037037 0 40.74074074074074 a 20.416666666666668 20.37037037037037 0 1 1 -20.416666666666668 20.37037037037037 c -2.0416666666666674 23.819444444444446 -38.79166666666668 23.819444444444446 -40.83333333333334 0 c -2.0416666666666674 23.819444444444446 -38.79166666666668 23.819444444444446 -40.83333333333334 0 c -2.0416666666666674 23.819444444444446 -38.79166666666668 23.819444444444446 -40.83333333333334 0 c -2.0416666666666674 23.819444444444446 -38.79166666666668 23.819444444444446 -40.83333333333334 0 c -2.0416666666666674 23.819444444444446 -38.79166666666668 23.819444444444446 -40.83333333333334 0 c -2.0416666666666674 23.819444444444446 -38.79166666666668 23.819444444444446 -40.83333333333334 0 c -2.0416666666666674 23.819444444444446 -38.79166666666668 23.819444444444446 -40.83333333333334 0 c -2.0416666666666674 23.819444444444446 -38.79166666666668 23.819444444444446 -40.83333333333334 0 a 20.416666666666668 20.37037037037037 0 1 1 -20.416666666666668 -20.37037037037037 c -23.76543209876543 -2.037037037037037 -23.76543209876543 -38.7037037037037 0 -40.74074074074074 c -23.76543209876543 -2.037037037037037 -23.76543209876543 -38.7037037037037 0 -40.74074074074074 c -23.76543209876543 -2.037037037037037 -23.76543209876543 -38.7037037037037 0 -40.74074074074074 c -23.76543209876543 -2.037037037037037 -23.76543209876543 -38.7037037037037 0 -40.74074074074074 c -23.76543209876543 -2.037037037037037 -23.76543209876543 -38.7037037037037 0 -40.74074074074074 c -23.76543209876543 -2.037037037037037 -23.76543209876543 -38.7037037037037 0 -40.74074074074074 c -23.76543209876543 -2.037037037037037 -23.76543209876543 -38.7037037037037 0 -40.74074074074074 z" stroke-width="10.416666666666629" stroke="rgba(255,0,0,1)" fill="none" transform="translate( -48.958333333333336 , 307.2916666666667 ) rotate( 0 )"/></g></svg>';
    const svgImage = new Image();
    svgImage.src = `data:image/svg+xml;base64,${btoa(markupSVG)}`;
    svgImage.onload = function() {
        ctx.drawImage(svgImage, 0, 0, canvas.width, canvas.height);
    };
    canvas.toBlob(function (blob) {
        console.log(blob);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        console.log(link.href);
        link.download = 'markup_screenshot.png';
        link.click();
        URL.revokeObjectURL(link.href);
    });
}


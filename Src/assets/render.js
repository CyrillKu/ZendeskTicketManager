//отрисовать окно приложения
async function renderWindow() {
    await showWarnings();
    var reclamations = await getValueFromField(RmApp.settings.reclamationsFieldId);
    var tasks = await getValueFromField(RmApp.settings.featuresFieldId);
    var tags = await getValueFromAPI('ticket.tags');
    var linkedData = await getValueFromField(RmApp.settings.linkedDataFieldId);
    if (reclamations) {
        reclamations.split(',').forEach(async function (number) {
            if (number !== '') {
                await addLinkField(number, '');
            }
        });
    }
    if (tasks) {
        tasks.split(',').forEach(async function (number) {
            if (number !== '') {
                tags.forEach(async function (tag) {
                    if (tag.includes(number) && tag.slice(-1) == "s") await addLinkField('', number, "SDK");
                    if (tag.includes(number) && tag.slice(-1) == "h") await addLinkField('', number, "HQ");
                    if (tag.includes(number) && tag.slice(-1) == "c") await addLinkField('', number, "Cloud");
                    if (tag.includes(number) && !isNaN(parseInt(tag.slice(-1)))) {
                        await addLinkField('', number, "HQ");
                    }
                });
            }
        });
    }
    if (!linkedData) {
        var container = document.querySelector('div[data-linkedBody]');
        container.classList.add('hidden');
        // if (await getValueFromAPI('ticket.status') !== 'closed') {
        //     var linked = document.querySelector('span[data-linkedCreate]');
        //     linked.classList.remove('hidden');
        // }
    } else {
        var isParent = (linkedData.indexOf('child') > -1) ? false : true;
        await addLinkedTicketToList(linkedData.substring(linkedData.indexOf(":") + 1,
            linkedData.length), isParent);
    }
    resizeWindow();
}

async function addLinkField(reclamationNumber, featureNumber, project = "") {
    var rmList = document.querySelector('ul[data-rmList]');
    var ftList = document.querySelector('ul[data-ftList]');
    var li = document.createElement('li');
    var a = document.createElement('a');
    var span = document.createElement('span');
    var closeTemplate = document.querySelector('button[data-close]');
    var closeButton = closeTemplate.cloneNode(true);
    closeButton.classList.remove('hidden');
    if (reclamationNumber !== '') {
        var url = RmApp.settings.recmanUrl + reclamationNumber;
        var fetchSelf = makeFetchBody(url, 'GET', '', RmApp.settings.tokenRm);
        client.request(fetchSelf).then(function (response) {
            span.innerHTML = response.stateName;
            span.classList.add('rm');
            span.classList.add('ck_label');
            if (response.stateName == "Verified")
                span.classList.add('good');
            else if (response.stateName == "Fixed")
                span.classList.add('fixed');
            else span.classList.add('bad');
        }, function (error) {
            console.log(error.responseJSON.Message);
        });
        a.innerHTML = reclamationNumber.trim();
        a.href = 'http://rm/view/' + reclamationNumber.trim();
        a.target = '_blank';
        rmList.appendChild(li);
        li.appendChild(a);
        li.appendChild(closeButton);
        li.appendChild(span);
    }
    if (featureNumber !== '') {
        a.innerHTML = featureNumber.trim();
        if (project.includes("HQ")) a.href = 'https://tfs/HQ/_workitems/edit/' + featureNumber.trim();
        if (project.includes("Cloud")) a.href = 'https://tfs/Cloud/_workitems/edit/' + featureNumber.trim();
        if (project.includes("SDK")) a.href = 'https://tfs/SDK/_workitems/edit/' + featureNumber.trim();
        a.target = '_blank';
        ftList.appendChild(li);
        li.appendChild(a);
        li.appendChild(closeButton);
    }
    resizeWindow();
}

async function addLinkedTicketToList(ticketNumber, isParent) {
    var linkedTicket = await getLinkedTicketData(ticketNumber);
    var section = document.querySelector('section[data-linked]');
    section.classList.remove('hidden');
    if (linkedTicket) {
        var id = document.querySelector('span[data-id]');
        var line = document.querySelector('span[data-line]');
        var assignee = document.querySelector('span[data-assignee]');
        var subject = document.querySelector('p[data-subject]');
        var status = document.querySelector('span[data-status]');
        if (isParent) {
            line.innerHTML = '<strong>2nd line ticket:</strong>';
        } else line.innerHTML = '<strong>1st line ticket:</strong>';
        id.innerText = ticketNumber;
        id.href = "";
        id.setAttribute("onclick", "openTicket(this)");
        status.innerText = capitalize(linkedTicket.status);
        status.classList.add(linkedTicket.status);
        subject.innerHTML += linkedTicket.subject;
        subject.classList.add("linked-subject");
        if (linkedTicket.assignee_id !== null) {
            var urlUsers = RmApp.settings.serverUrl + '/api/v2/users/' + linkedTicket.assignee_id +
                '.json';
            var fetchUsers = makeFetchBody(urlUsers, 'GET', '', null);
            var responseUsers = await client.request(fetchUsers);
            assignee.innerText = responseUsers.user.name;
        }

    } else {
        section.innerHTML = "<div style=\"text-align: center; padding-top: 10px;\">Ticket <a data-id=\"\" href=\"\" onclick=\"openTicket(this)\">" + ticketNumber + "</a> was deleted. You can either restore it or <span class=\"link\" onclick=\"deleteLinkedData()\">delete</span> the link to this ticket from here.</div>"
    }

}

function addWarning(category, row, label = null) {
    var container = document.querySelector('span[data-' + category + ']');
    var div = document.querySelector('div[data-container' + row + ']');
    if (label) {
        var span = document.createElement('span');
        span.classList.add('ck_label');
        if (label.includes("Standard") || label.includes("Low") || label.includes("Normal") || label.includes("Closed")) {
            span.classList.add('good');
        } else if (label.includes("High") || label.includes("Extended")) {
            span.classList.add('warning');
        } else if (label.includes("Critical") || label.includes("Premier") || label.includes("Major") || label.includes("Urgent") || label.includes("Open")) {
            span.classList.add('bad');
        }
        if (label.includes('VIP')) {
            span.classList.add('warning');
            span.classList.add('vip');
        }
        span.innerHTML = label;
        container.appendChild(span);
    }
    container.classList.remove('hidden');
    div.classList.remove('hidden');
}

async function removeElementFromList(element) {
    RmApp.numbers.splice(RmApp.numbers.findIndex(elem => elem === element), 1, '');
    if (element.parentNode.parentNode.id == 'rmList') {
        var current = await getValueFromField(RmApp.settings.reclamationsFieldId);
        var updatedRM = current.replace(getNumberFromUrl(element.previousSibling) + ',', '');
        removeTag('rm' + getNumberFromUrl(element.previousSibling));
        updateField(RmApp.settings.reclamationsFieldId, updatedRM);
        if (updatedRM == '') removeTag('reclamation');
    } else if (element.parentNode.parentNode.id == 'ftList') {
        var current = await getValueFromField(RmApp.settings.featuresFieldId);
        var updatedFT = current.replace(getNumberFromUrl(element.previousSibling) + ',', '');
        var tags = await getValueFromAPI('ticket.tags');
        tags.forEach(function (tag) {
            if (tag.includes(getNumberFromUrl(element.previousSibling))) removeTag(tag);
        })
        if (updatedFT == '') removeTag('tfs');
        updateField(RmApp.settings.featuresFieldId, updatedFT);
    }
    element.parentNode.remove();
    resizeWindow();
}

function resizeWindow() {
    client.invoke('resize', {
        width: '100%',
        height: document.getElementById('container').offsetHeight
    });
}
function hideLinkedPlus() {
    var button = document.querySelector('span[data-linkedCreate]');
    button.classList.add('hidden');
}

async function addLinkField(reclamationNumber, featureNumber) {
    var rmList = document.querySelector('ul[data-rmList]');
    var ftList = document.querySelector('ul[data-ftList]');
    var li = document.createElement('li');
    var a = document.createElement('a');
    var span = document.createElement('span');
    var closeTemplate = document.querySelector('button[data-close]');
    var closeButton = closeTemplate.cloneNode(true);
    closeButton.classList.remove('hidden');
    if (reclamationNumber !== '') {
        var url = "https://recmanapi.abbyy.com/api/reclamation/" + reclamationNumber;
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
        a.href = 'https://tfs/HQ/DataCapture/Desktop/_workitems/edit/' + featureNumber.trim();
        a.target = '_blank';
        ftList.appendChild(li);
        li.appendChild(a);
        li.appendChild(closeButton);
    }
    resizeWindow(RmApp.rmHeight);
}

async function addLinkedTicketToList(ticketNumber, isParent) {
    var linkedTicket = await getLinkedTicketData(ticketNumber);
    var section = document.querySelector('section[data-linked]');
    section.classList.remove('hidden');
    if (linkedTicket) {
        var id = document.querySelector('a[data-id]');
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
//отрисовать окно приложения
async function renderWindow() {
    var isAdded = await showWarnings();
    var finalHeight = 0;
    var quantity = 0;
    var reclamations = await getValueFromField(RmApp.settings.reclamationsFieldId);
    var tasks = await getValueFromField(RmApp.settings.featuresFieldId);
    var linkedData = await getValueFromField(RmApp.settings.linkedDataFieldId);
    if (reclamations) {
        reclamations.split(',').forEach(async function (number) {
            if (number !== '') {
                await addLinkField(number, '');
            }
        });
        var reclamationArray = reclamations.slice(0, -1).split(',');
        quantity += reclamationArray.length;
    }
    if (tasks) {
        tasks.split(',').forEach(async function (number) {
            if (number !== '') {
                await addLinkField('', number);
            }
        });
        var tasksArray = tasks.slice(0, -1).split(',');
        quantity += tasksArray.length;
    }
    if (!linkedData) {
        if (await getValueFromAPI('ticket.status') !== 'closed') {
            var linked = document.querySelector('span[data-linkedCreate]');
            linked.classList.remove('hidden');
        }
    } else {
        var isParent = (linkedData.indexOf('child') > -1) ? false : true;
        await addLinkedTicketToList(linkedData.substring(linkedData.indexOf(":") + 1,
            linkedData.length), isParent);
        finalHeight += RmApp.linkedHeight;
    }
    if (isAdded) finalHeight += RmApp.warningHeight;
    resizeWindow(finalHeight + quantity * RmApp.rmHeight);
    RmApp.currHeight = RmApp.initHeight + finalHeight + quantity * RmApp.rmHeight;
}

async function resizeWindow(value) {
    if (RmApp.currHeight) {
        console.log(RmApp.currHeight)
        await client.invoke('resize', {
            width: '100%',
            height: RmApp.currHeight + value
        })
        RmApp.currHeight += value;
    } else
        await client.invoke('resize', {
            width: '100%',
            height: RmApp.initHeight + value
        })
}
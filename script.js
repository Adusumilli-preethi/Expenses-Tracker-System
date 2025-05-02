
(function(){
  // Utility to simplify localStorage JSON
  function storageGet(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }
  function storageSet(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // State
  let currentRole = '';
  let units = storageGet('companyUnits'); // array of unit objects
  let requests = storageGet('moneyRequests'); // array of request objects
  // request object: {id, unitName, amount, reason, status: 'pending'|'approved'|'rejected'}

  // Dom refs
  const roleSelect = document.getElementById('role-select');
  const handlerSection = document.getElementById('handler-section');
  const accountantSection = document.getElementById('accountant-section');
  const managerSection = document.getElementById('manager-section');
  const logoutBtn = document.getElementById('logout-btn');

  function showSection(section) {
    handlerSection.classList.add('hidden');
    accountantSection.classList.add('hidden');
    managerSection.classList.add('hidden');
    section.classList.remove('hidden');
  }

  function showRoleUI(role) {
    currentRole = role;
    roleSelect.value = role;
    logoutBtn.classList.remove('hidden');
    document.getElementById('role-selection-section').classList.add('hidden');

    if (role === 'handler') {
      showSection(handlerSection);
      renderUnitsTable();
      renderUnitsInRequestForm();
    } else if (role === 'accountant') {
      showSection(accountantSection);
      renderUnitsInRequestForm();
      renderMyRequests();
    } else if (role === 'manager') {
      showSection(managerSection);
      renderPendingRequests();
      renderAllRequests();
    }
  }

  roleSelect.addEventListener('change', () => {
    const val = roleSelect.value;
    if (val) {
      showRoleUI(val);
    }
  });

  logoutBtn.addEventListener('click', () => {
    currentRole = '';
    roleSelect.value = '';
    handlerSection.classList.add('hidden');
    accountantSection.classList.add('hidden');
    managerSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    document.getElementById('role-selection-section').classList.remove('hidden');
  });

  // Handler form logic
  const workerForm = document.getElementById('worker-form');
  const workerError = document.getElementById('worker-error');
  workerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    workerError.textContent = '';
    const unitName = document.getElementById('unit-name').value.trim();
    const numMembers = parseInt(document.getElementById('num-members').value, 10);
    const workCompleted = parseInt(document.getElementById('work-completed').value, 10);
    const workPending = parseInt(document.getElementById('work-pending').value, 10);
    let pendingReason = document.getElementById('pending-reason').value.trim();

    if (!unitName) {
      workerError.textContent = 'Unit name is required.';
      return;
    }
    if (numMembers <= 0) {
      workerError.textContent = 'Number of members must be a positive number.';
      return;
    }
    if (workCompleted < 0 || workCompleted > 100) {
      workerError.textContent = 'Work completed % must be between 0 and 100.';
      return;
    }
    if (workPending < 0 || workPending > 100) {
      workerError.textContent = 'Work pending % must be between 0 and 100.';
      return;
    }
    if (workCompleted + workPending > 100) {
      workerError.textContent = 'Total work (completed + pending) cannot exceed 100%.';
      return;
    }
    if (workPending > 0 && !pendingReason) {
      workerError.textContent = 'Please provide a reason for pending work.';
      return;
    }
    if (workPending === 0) {
      pendingReason = '';
    }

    // Check if unit exists
    const index = units.findIndex(u => u.unitName.toLowerCase() === unitName.toLowerCase());
    if (index > -1) {
      // Update existing unit
      units[index].numMembers = numMembers;
      units[index].workCompleted = workCompleted;
      units[index].workPending = workPending;
      units[index].pendingReason = pendingReason;
    } else {
      // Add new unit
      units.push({unitName, numMembers, workCompleted, workPending, pendingReason});
    }
    storageSet('companyUnits', units);
    workerForm.reset();
    renderUnitsTable();
    renderUnitsInRequestForm();
  });

  function renderUnitsTable() {
    const tbody = document.querySelector('#units-table tbody');
    tbody.innerHTML = '';
    if (units.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#777;">No units added yet.</td></tr>';
      return;
    }
    units.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.unitName}</td>
        <td>${u.numMembers}</td>
        <td>${u.workCompleted}</td>
        <td>${u.workPending}</td>
        <td>${u.pendingReason || '-'}</td>
        <td><button data-unit="${u.unitName}">Edit</button></td>
      `;
      tr.querySelector('button').addEventListener('click', () => {
        document.getElementById('unit-name').value = u.unitName;
        document.getElementById('num-members').value = u.numMembers;
        document.getElementById('work-completed').value = u.workCompleted;
        document.getElementById('work-pending').value = u.workPending;
        document.getElementById('pending-reason').value = u.pendingReason || '';
        window.scrollTo({top: 0, behavior: 'smooth'});
      });
      tbody.appendChild(tr);
    });
  }

  // Accountant logic

  const requestForm = document.getElementById('request-form');
  const requestError = document.getElementById('request-error');

  function renderUnitsInRequestForm() {
    const select = document.getElementById('request-unit');
    select.innerHTML = '';
    if (units.length === 0) {
      select.innerHTML = '<option value="">No units available</option>';
      return;
    }
    select.innerHTML = '<option value="">-- Select Unit --</option>';
    units.forEach(u => {
      select.innerHTML += `<option value="${u.unitName}">${u.unitName}</option>`;
    });
  }

  requestForm.addEventListener('submit', e => {
    e.preventDefault();
    requestError.textContent = '';
    const unitName = document.getElementById('request-unit').value;
    const amount = parseFloat(document.getElementById('request-amount').value);
    const reason = document.getElementById('request-reason').value.trim();

    if (!unitName) {
      requestError.textContent = 'Please select a unit.';
      return;
    }
    if (!amount || amount <= 0) {
      requestError.textContent = 'Please enter a positive amount.';
      return;
    }
    if (!reason) {
      requestError.textContent = 'Please provide a reason for the money request.';
      return;
    }

    // Create request with id and status pending
    const newRequest = {
      id: 'REQ' + (requests.length + 1).toString().padStart(4,'0'),
      unitName,
      amount: amount.toFixed(2),
      reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    requests.push(newRequest);
    storageSet('moneyRequests', requests);
    requestForm.reset();
    renderMyRequests();
    alert('Request submitted successfully. Waiting for manager approval.');
  });

  function renderMyRequests() {
    const tbody = document.querySelector('#my-requests-table tbody');
    tbody.innerHTML = '';
    if (requests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#777;">No requests submitted yet.</td></tr>';
      return;
    }
    requests.forEach(r => {
      const tr = document.createElement('tr');
      let statusHtml = '';
      if (r.status === 'pending') {
        statusHtml = '<span style="color:orange; font-weight:bold;">Pending</span>';
      } else if (r.status === 'approved') {
        statusHtml = '<span style="color:green; font-weight:bold;">Approved</span>';
      } else {
        statusHtml = '<span style="color:red; font-weight:bold;">Rejected</span>';
      }
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.unitName}</td>
        <td>${r.amount}</td>
        <td>${r.reason}</td>
        <td>${statusHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Manager logic

  function renderPendingRequests() {
    const tbody = document.querySelector('#approval-requests-table tbody');
    tbody.innerHTML = '';
    const pendingReqs = requests.filter(r => r.status === 'pending');
    if (pendingReqs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#777;">No pending requests.</td></tr>';
      return;
    }
    pendingReqs.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.unitName}</td>
        <td>${r.amount}</td>
        <td>${r.reason}</td>
        <td>
          <button class="approve-btn" data-id="${r.id}">Approve</button>
          <button class="reject-btn" data-id="${r.id}">Reject</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach event listeners
    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        changeRequestStatus(btn.dataset.id, 'approved');
      });
    });
    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        changeRequestStatus(btn.dataset.id, 'rejected');
      });
    });
  }

  function renderAllRequests() {
    const tbody = document.querySelector('#all-requests-table tbody');
    tbody.innerHTML = '';
    if (requests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#777;">No requests submitted yet.</td></tr>';
      return;
    }
    requests.forEach(r => {
      let statusClass = '';
      if (r.status === 'approved') {
        statusClass = 'approved';
      } else if (r.status === 'rejected') {
        statusClass = 'rejected';
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.unitName}</td>
        <td>${r.amount}</td>
        <td>${r.reason}</td>
        <td class="${statusClass}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function changeRequestStatus(requestId, newStatus) {
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex > -1) {
      requests[reqIndex].status = newStatus;
      storageSet('moneyRequests', requests);
      alert(`Request ${requestId} has been ${newStatus}.`);
      if (currentRole === 'manager') {
        renderPendingRequests();
        renderAllRequests();
      } else if (currentRole === 'accountant') {
        renderMyRequests();
      }
    }
  }

  // Init - if role was stored, restore UI (optional)
  // For simplicity, start at role selection screen.





  function renderPendingRequests() {
    const tbody = document.querySelector('#approval-requests-table tbody');
    tbody.innerHTML = '';
    const pendingReqs = requests.filter(r => r.status === 'pending');
    if (pendingReqs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#777;">No pending requests.</td></tr>';
        return;
    }
    pendingReqs.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.id}</td>
            <td>${r.unitName}</td>
            <td>${r.amount}</td>
            <td>${r.reason}</td>
            <td>
                <button class="approve-btn" data-id="${r.id}">Approve</button>
                <button class="reject-btn" data-id="${r.id}">Reject</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach event listeners
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            changeRequestStatus(btn.dataset.id, 'approved');
        });
    });
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            changeRequestStatus(btn.dataset.id, 'rejected');
        });
    });
}

function changeRequestStatus(requestId, newStatus) {
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex > -1) {
        requests[reqIndex].status = newStatus;
        storageSet('moneyRequests', requests);
        alert(`Request ${requestId} has been ${newStatus}.`);
        if (currentRole === 'manager') {
            renderPendingRequests();
            renderAllRequests();
        } else if (currentRole === 'accountant') {
            renderMyRequests();
        }
    }
}
})();

function showNotification(success, message){
    var notification = document.getElementById("alert");
    notification.style.display = "block";
    if (success){
        notification.className = "success";
        notification.innerHTML = 
            `<span class="closebtn">&times;</span> 
            <strong class="notification_text">Success!</strong> ${message}`;
    } else {
        notification.className = "error";
        notification.innerHTML = 
            `<span class="closebtn">&times;</span> 
            <strong class="notification_text">Error!</strong> ${message}`;
    }
    document.getElementsByClassName("closebtn")[0].onclick = function(){
        document.getElementById("alert").style.display = "none";
    };
}
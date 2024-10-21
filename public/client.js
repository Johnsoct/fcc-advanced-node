$(document).ready(function () {
        /*global io*/
        const socket = io() // Loaded via CDN script in chat.pug
        socket.on('user count', function (data) {
                console.log(data)
        })

        socket.on('disconnect', function () {
                console.log('MF\'er disconnected')
        })

        // Form submittion with new message in field with id 'm'
        $('form').submit(function () {
                var messageToSend = $('#m').val();

                $('#m').val('');
                return false; // prevent form submit from refreshing page
        });
});

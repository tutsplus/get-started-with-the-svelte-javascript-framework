<div>
    <ul>
    {#if !user.isAuth }
        <li>
            <a href="#">Login</a>
        </li>
    {:else}
        <li>
            <a href="#">Dashboard</a>
        </li>
        <li>
            <a href="#">Profile</a>
        </li>
        <li>
            <a href="#">Logout</a>
        </li>


    {/if}
    </ul>
</div>

<style>
div {
    height: 20px;
    padding: 10px 15px;
    background-color: #7952B3;
}

ul {
    padding: 0;
    list-style: none;
    margin: auto 0 auto auto;
}

li {
    display: inline-block;
    margin: 0;
    padding-left: 15px;
}

a {
    color: white;
}

.active {
    font-weight: bold;
}
</style>

<script>
export let user = {};
</script>
<!DOCTYPE html>
<html>

<head>
   <title>test page</title>
   <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css" integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh" crossorigin="anonymous">

   <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js"></script>
   <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js"></script>

   <script src="test.js"></script>
</head>

<body>
   <div class="container pt-4">
      <div class="table-responsive">
         <table class="table table-bordered">
            <thead>
               <tr>
                  <th class="text-center">Kolom 1<button class="btn btn-md btn-primary" id="addBtn1" type="button">+</button></th>
                  <th class="text-center">Kolom 2<button class="btn btn-md btn-primary" id="addBtn2" type="button">+</button></th>
                  <th class="text-center">Kolom 3<button class="btn btn-md btn-primary" id="addBtn3" type="button">+</button></th>
               </tr>
            </thead>
            <tbody id="tbody">

            </tbody>
         </table>
      </div>

   </div>
</body>

</html>
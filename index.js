const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
var hash = require("password-hash");
const bodyparser = require("body-parser");
const cron = require("node-cron");

var serviceAccount = require("./key.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const express = require("express");

const app = express();

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());

app.use(express.static("public"));

async function midnightTask() {
  try {
    const snapshot = await db.collection("ClassData").get();

    snapshot.forEach((doc) => {
      for (var i = 0; i < doc.data().count; i++) {
        doc.ref.update({
          [doc.data()[i]]: "0",
        });
      }
    });

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const day = currentDate.getDate().toString().padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    var b = ["AIML", "AIDS", "CSE", "IT", "ECE", "CSBS", "ME", "CE"];

    for (var y = 1; y <= 4; y++) {
      for (var z = 0; z <= 7; z++) {
        var br = b[z];

        var regset = new Set();

        const permissionSnapshot = await db
          .collection("PermissionData")
          .where("year", "==", y.toString())
          .where("branch", "==", br)
          .get();

        for (const doc of permissionSnapshot.docs) {
          if (doc.data().to < formattedDate) {
            await doc.ref.delete();
          } else {
            regset.add(doc.data().regno);
          }
        }

        var res = {};

        regset.forEach(function (reg) {
          res[reg] = "0";
        });

        const permissionSnapshot2 = await db
          .collection("PermissionData")
          .where("year", "==", y.toString())
          .where("branch", "==", br)
          .get();

        for (const doc of permissionSnapshot2.docs) {
          var pdvalue = doc.data().Gval;
          var value = res[doc.data().regno];
          if (value == "0") {
            value = pdvalue;
          } else if (value == "3") {
            value = "3";
          } else if (value == "1") {
            if (pdvalue == "2" || pdvalue == "3") {
              value = "3";
            }
          } else if (value == "2") {
            if (pdvalue == "1" || pdvalue == "3") {
              value = "3";
            }
          }
          res[doc.data().regno] = value;
        }

        const classSnapshot = await db
          .collection("ClassData")
          .where("year", "==", y.toString())
          .where("branch", "==", br)
          .get();

        if (classSnapshot._size == 1) {
          for (const doc of classSnapshot.docs) {
            regset.forEach(function (reg) {
              doc.ref.update({
                [reg]: res[reg],
              });
            });
          }
        }
      }
    }

    for (var z = 0; z <= 7; z++) {
      const hodSnapshot = await db
        .collection("HOD-" + b[z])
        .where("to", "<", formattedDate)
        .get();

      for (const doc of hodSnapshot.docs) {
        await doc.ref.delete();
      }
    }
  } catch (error) {
    console.error(error);
  }
}

cron.schedule(" 0 0 * * *", midnightTask);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});

app.get("/logout", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});

app.post("/studentloginsubmit", (req, res) => {
  db.collection("StudentLogin")
    .where("username", "==", req.body.inuser)
    .get()
    .then((docs) => {
      if (docs._size == 0) {
        res.sendFile(__dirname + "/logininvalid.html");
      } else {
        docs.forEach((doc) => {
          if (hash.verify(req.body.inpass, doc.data().password)) {
            res.send(
              '<!DOCTYPE html> <html> <head> <style> ul { list-style-type: none; margin: 0; padding: 0; overflow: hidden; background-color: #333; position: -webkit-sticky; position: sticky; top: 0; } li { float: left; } li .nb { border: none; background: none; text-decoration: none; display: block; color: white; text-align: center; padding: 14px 16px; } li .nb:hover { background-color: #111; } #active { background-color: #4CAF50; } .lab{ background-color: #4CAF50; color: white; border-radius: 4px; width: 80px; padding: 10px; } form{ font-size: 0.5cm; } table{ background-color: #333; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; } select { width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } select option { padding: 5px; font-size: 14px; background-color: #fff; color: #333; text-align: center; } select option:hover { background-color: #f0f0f0; } #sb{ width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } #sb:hover{ background-color: #4CAF50; color: white; border-color: white; } #hide{ display: none; } #logout{ float: right; } </style> </head> <body> <ul> <li> <form action="/student_class_info" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
                req.body.inuser +
                '"> </div> <button id="active" type="submit" class="nb">Home</button> </form> </li> <li> <form action="/message" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
                req.body.inuser +
                '"> </div> <button type="submit" class="nb">Message</button> </form> </li> <li> <form action="/approvals" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
                req.body.inuser +
                '"> </div> <button type="submit" class="nb">Approvals</button> </form> </li> <li id="logout"> <form action="/logout" method="get"> <button type="submit" class="nb">Log out</button> </form> </li> </ul> <br> <div> <center> <form action="/student_attendance_search" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
                req.body.inuser +
                '"> </div> <table> <tr> <td class="lab"><label>Year:</label></td> <td> <select name="year" required> <option>select</option> <option value="1">1-year</option> <option value="2">2-year</option> <option value="3">3-year</option> <option value="4">4-year</option> </select> </td> </tr> <tr> <td class="lab"><label>Branch:</label></td> <td> <select name="branch" required> <option>select</option> <option value="AIML">AIML</option> <option value="AIDS">AIDS</option> <option value="CSE">CSE</option> <option value="IT">IT</option> <option value="CSBS">CSBS</option> <option value="ECE">ECE</option> <option value="CE">CE</option> <option value="ME">ME</option> </select> </td> </tr> <br> <tr> <td colspan="2"> <center> <button id="sb" type="submit" >Get details</button> </center> </td> </tr> </table> </form> </center> </div> </body> </html> ',
            );
          } else {
            res.sendFile(__dirname + "/logininvalid.html");
          }
        });
      }
    });
});

app.get("/studentsignup", (req, res) => {
  res.sendFile(__dirname + "/signup.html");
});

app.post("/studentsignupsubmit", (req, res) => {
  db.collection("StudentLogin")
    .where("username", "==", req.body.upuser)
    .get()
    .then((docs) => {
      if (docs._size >= 1) {
        res.sendFile(__dirname + "/signup_result.html");
      } else {
        db.collection("StudentLogin").add({
          username: req.body.upuser,
          password: hash.generate(req.body.uppass),
          year: req.body.year,
          branch: req.body.branch,
        });
        res.sendFile(__dirname + "/signupsuccessfull.html");
      }
    });
});

app.get("/student_class_info", (req, res) => {
  res.send(
    '<!DOCTYPE html> <html> <head> <style> ul { list-style-type: none; margin: 0; padding: 0; overflow: hidden; background-color: #333; position: -webkit-sticky; position: sticky; top: 0; } li { float: left; } li .nb { border: none; background: none; text-decoration: none; display: block; color: white; text-align: center; padding: 14px 16px; } li .nb:hover { background-color: #111; } #active { background-color: #4CAF50; } .lab{ background-color: #4CAF50; color: white; border-radius: 4px; width: 80px; padding: 10px; } form{ font-size: 0.5cm; } table{ background-color: #333; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; } select { width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } select option { padding: 5px; font-size: 14px; background-color: #fff; color: #333; text-align: center; } select option:hover { background-color: #f0f0f0; } #sb{ width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } #sb:hover{ background-color: #4CAF50; color: white; border-color: white; } #hide{ display: none; } #logout{ float: right; } </style> </head> <body> <ul> <li> <form action="/student_class_info" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button id="active" type="submit" class="nb">Home</button> </form> </li> <li> <form action="/message" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button type="submit" class="nb">Message</button> </form> </li> <li> <form action="/approvals" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button type="submit" class="nb">Approvals</button> </form> </li> <li id="logout"> <form action="/logout" method="get"> <button type="submit" class="nb">Log out</button> </form> </li> </ul> <br> <div> <center> <form action="/student_attendance_search" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <table> <tr> <td class="lab"><label>Year:</label></td> <td> <select name="year" required> <option>select</option> <option value="1">1-year</option> <option value="2">2-year</option> <option value="3">3-year</option> <option value="4">4-year</option> </select> </td> </tr> <tr> <td class="lab"><label>Branch:</label></td> <td> <select name="branch" required> <option>select</option> <option value="AIML">AIML</option> <option value="AIDS">AIDS</option> <option value="CSE">CSE</option> <option value="IT">IT</option> <option value="CSBS">CSBS</option> <option value="ECE">ECE</option> <option value="CE">CE</option> <option value="ME">ME</option> </select> </td> </tr> <br> <tr> <td colspan="2"> <center> <button id="sb" type="submit" >Get details</button> </center> </td> </tr> </table> </form> </center> </div> </body> </html> ',
  );
});

app.get("/student_attendance_search", async (req, res) => {
  const classDocs = await db
    .collection("ClassData")
    .where("year", "==", req.query.year)
    .where("branch", "==", req.query.branch)
    .get();

  classDocs.forEach((doc) => {
    var temp = "";
    var j = "";
    for (var i = 0; i < doc.data().count; i++) {
      if (i % 5 == 0) {
        temp = temp + "</tr><tr>";
      }
      j = doc.data()[i];
      if (doc.data()[j] == 0 || doc.data()[j] == -1) {
        temp = temp + "<td>" + j + "</td>";
      } else if (doc.data()[j] == 1) {
        temp = temp + '<td class="G">' + j + "</td>";
      } else if (doc.data()[j] == 2) {
        temp = temp + '<td class="B">' + j + "</td>";
      } else if (doc.data()[j] == 3) {
        temp = temp + '<td class="Y">' + j + "</td>";
      }
    }

    res.send(
      '<!DOCTYPE html> <html> <head> <style> ul { list-style-type: none; margin: 0; padding: 0; overflow: hidden; background-color: #333; position: -webkit-sticky; position: sticky; top: 0; } li { float: left; } li .nb { border: none; background: none; text-decoration: none; display: block; color: white; text-align: center; padding: 14px 16px; } li .nb:hover { background-color: #111; } #active { background-color: #4CAF50; } #tab{ background-color: #333; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; font-size: 0.7cm; } td{ background-color: white; color: #333; border-radius: 4px; width: 80px; padding: 10px; } th{ background-color: #4CAF50; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; font-size: 0.7cm; color: white; } #PG{ width: 1cm; height: 1cm; background-color: #4CAF50; float: left; } #signal{ float: right; } #GS{ width: 1cm; height: 1cm; background-color: #4CAF50; } #YS{ width: 1cm; height: 1cm; background-color: yellow; } #BS{ width: 1cm; height: 1cm; background-color: blue; } .G{ background-color: #4CAF50; } .B{ background-color: blue; } .Y{ background-color: yellow; } #hide{ display: none; } #logout{ float: right; } </style> </head> <body> <ul> <li> <form action="/student_class_info" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
        req.query.inuser +
        '"> </div> <button type="submit" class="nb">Home</button> </form> </li> <li> <form action="/message" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
        req.query.inuser +
        '"> </div> <button type="submit" class="nb">Message</button> </form> </li> <li> <form action="/approvals" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
        req.query.inuser +
        '"> </div> <button type="submit" class="nb">Approvals</button> </form> </li> <li id="logout"> <form action="/logout" method="get"> <button type="submit" class="nb">Log out</button> </form> </li> </ul> <div> <center> <table> <tr> <th>' +
        req.query.year +
        "-year/" +
        req.query.branch +
        '</td> </tr> </table> </center> <div id="signal"> <table> <tr> <td> <div id="GS"></div> </td> <td> Attendance Granted </td> </tr> <tr> <td> <div id="BS"></div> </td> <td> Outing Granted </td> </tr> <tr> <td> <div id="YS"></div> </td> <td> Attendance & Outing Granted </td> </tr> </table> </div> <center> <table id="tab"> <tr> ' +
        temp +
        " </tr> </table> </center> </div> </body> </html>",
    );
  });
});

app.get("/message", (req, res) => {
  res.send(
    '<!DOCTYPE html> <html> <head> <style> ul { list-style-type: none; margin: 0; padding: 0; overflow: hidden; background-color: #333; position: -webkit-sticky; position: sticky; top: 0; } li { float: left; } li .nb { border: none; background: none; text-decoration: none; display: block; color: white; text-align: center; padding: 14px 16px; } li .nb:hover { background-color: #111; } #active { background-color: #4CAF50; } .lab{ background-color: #4CAF50; color: white; border-radius: 4px; width: 80px; padding: 10px; } form{ font-size: 0.5cm; } table{ background-color: #333; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; } select { width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } input{ width: 130px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } select option { padding: 5px; font-size: 14px; background-color: #fff; color: #333; text-align: center; } select option:hover { background-color: #f0f0f0; } #sb{ width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } #sb:hover{ background-color: #4CAF50; color: white; border-color: white; } #hide{ display: none; } #logout{ float: right; } </style> </head> <body> <ul> <li> <form action="/student_class_info" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button type="submit" class="nb">Home</button> </form> </li> <li> <form action="/message" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button id="active" type="submit" class="nb">Message</button> </form> </li> <li> <form action="/approvals" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button type="submit" class="nb">Approvals</button> </form> </li> <li id="logout"> <form action="/logout" method="get"> <button type="submit" class="nb">Log out</button> </form> </li> </ul> <br> <div> <center> <form action="/send_message" method="get"> <div> <input id="hide" type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <table> <tr> <td class="lab"><label>To:</label></td> <td> <select name="touser" required> <option>select</option> <option value="HOD-AIML">HOD-AIML</option> <option value="HOD-AIDS">HOD-AIDS</option> <option value="HOD-CSE">HOD-CSE</option> <option value="HOD-IT">HOD-IT</option> <option value="HOD-CSBS">HOD-CSBS</option> <option value="HOD-ECE">HOD-ECE</option> <option value="HOD-CE">HOD-CE</option> <option value="HOD-ME">HOD-ME</option> </select> </td> </tr> <tr> <td class="lab"><label>Year:</label></td> <td> <select name="year" required> <option>select</option> <option value="1">1-year</option> <option value="2">2-year</option> <option value="3">3-year</option> <option value="4">4-year</option> </select> </td> </tr> <tr> <td class="lab"><label>Branch:</label></td> <td> <select name="branch" required> <option>select</option> <option value="AIML">AIML</option> <option value="AIDS">AIDS</option> <option value="CSE">CSE</option> <option value="IT">IT</option> <option value="CSBS">CSBS</option> <option value="ECE">ECE</option> <option value="CE">CE</option> <option value="ME">ME</option> </select> </td> </tr> <tr> <td class="lab"><label>Date From:</label></td> <td><input type="date" name="from" required></td> </tr> <tr> <td class="lab"><label>Date To:</label></td> <td><input type="date" name="to" required></td> </tr> <tr> <td class="lab"><label>Message:</label></td> <td> <textarea name="message" rows="15" cols="100" required></textarea> </td> </tr> <br> <tr> <td colspan="2"> <center> <button id="sb" type="submit" >Send Message</button> </center> </td> </tr> </table> </form> </center> </div> </body> </html> ',
  );
});

app.get("/send_message", (req, res) => {
  db.collection(req.query.touser).add({
    regno: req.query.inuser,
    branch: req.query.branch,
    year: req.query.year,
    from: req.query.from,
    to: req.query.to,
    message: req.query.message,
    AG: "0",
    OG: "0",
  });
  res.send(
    '<!DOCTYPE html> <html> <head> <style> ul { list-style-type: none; margin: 0; padding: 0; overflow: hidden; background-color: #333; position: -webkit-sticky; position: sticky; top: 0; } li { float: left; } li .nb { border: none; background: none; text-decoration: none; display: block; color: white; text-align: center; padding: 14px 16px; } li .nb:hover { background-color: #111; } #active { background-color: #4CAF50; } .block { background-color: #4CAF50; color: white; border-radius: 4px; width: 220px; padding: 10px; } .lab{ background-color: #4CAF50; color: white; border-radius: 4px; width: 80px; padding: 10px; } form{ font-size: 0.5cm; } table{ background-color: #333; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; } select { width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } input{ width: 130px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } select option { padding: 5px; font-size: 14px; background-color: #fff; color: #333; text-align: center; } select option:hover { background-color: #f0f0f0; } #sb{ width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } #sb:hover{ background-color: #4CAF50; color: white; border-color: white; } #hide{ display: none; } #logout{ float: right; } </style> </head> <body> <ul> <li> <form action="/student_class_info" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button type="submit" class="nb">Home</button> </form> </li> <li> <form action="/message" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button id="active" type="submit" class="nb">Message</button> </form> </li> <li> <form action="/approvals" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button type="submit" class="nb">Approvals</button> </form> </li> <li id="logout"> <form action="/logout" method="get"> <button type="submit" class="nb">Log out</button> </form> </li> </ul> <br> <div> <center> <form action="/send_message" method="get"> <div> <input id="hide" type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <table> <tr> <td colspan="2"> <center> <p class="block">Message sent successfully</p> </center> </td> </tr> <tr> <td class="lab"><label>To:</label></td> <td> <select name="touser" required> <option>select</option> <option value="HOD-AIML">HOD-AIML</option> <option value="HOD-AIDS">HOD-AIDS</option> <option value="HOD-CSE">HOD-CSE</option> <option value="HOD-IT">HOD-IT</option> <option value="HOD-CSBS">HOD-CSBS</option> <option value="HOD-ECE">HOD-ECE</option> <option value="HOD-CE">HOD-CE</option> <option value="HOD-ME">HOD-ME</option> </select> </td> </tr> <tr> <td class="lab"><label>Year:</label></td> <td> <select name="year" required> <option>select</option> <option value="1">1-year</option> <option value="2">2-year</option> <option value="3">3-year</option> <option value="4">4-year</option> </select> </td> </tr> <tr> <td class="lab"><label>Branch:</label></td> <td> <select name="branch" required> <option>select</option> <option value="AIML">AIML</option> <option value="AIDS">AIDS</option> <option value="CSE">CSE</option> <option value="IT">IT</option> <option value="CSBS">CSBS</option> <option value="ECE">ECE</option> <option value="CE">CE</option> <option value="ME">ME</option> </select> </td> </tr> <tr> <td class="lab"><label>Date From:</label></td> <td><input type="date" name="from" required></td> </tr> <tr> <td class="lab"><label>Date To:</label></td> <td><input type="date" name="to" required></td> </tr> <tr> <td class="lab"><label>Message:</label></td> <td> <textarea name="message" rows="15" cols="100" required></textarea> </td> </tr> <br> <tr> <td colspan="2"> <center> <button id="sb" type="submit" >Send Message</button> </center> </td> </tr> </table> </form> </center> </div> </body> </html> ',
  );
});

app.get("/approvals", async (req, res) => {
  db.collection("PermissionData")
    .where("regno", "==", req.query.inuser)
    .get()
    .then((indocs) => {
      var temp =
        '<!DOCTYPE html> <html> <head> <style> ul { list-style-type: none; margin: 0; padding: 0; overflow: hidden; background-color: #333; position: -webkit-sticky; position: sticky; top: 0; } li { float: left; } li .nb { border: none; background: none; text-decoration: none; display: block; color: white; text-align: center; padding: 14px 16px; } li .nb:hover { background-color: #111; } #active { background-color: #4CAF50; } .lab{ background-color: #4CAF50; color: white; border-radius: 4px; width: 80px; padding: 10px; } form{ font-size: 0.5cm; } table{ background-color: #333; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; } select { width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } input{ width: 130px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } select option { padding: 5px; font-size: 14px; background-color: #fff; color: #333; text-align: center; } select option:hover { background-color: #f0f0f0; } .result{ width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; outline: none; } #hide{ display: none; } .G{ width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #4CAF50; color: white; outline: none; } .R{ width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: red; color: white; outline: none; } #logout{ float: right; } </style> </head> <body> <ul> <li> <form action="/student_class_info" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
        req.query.inuser +
        '"> </div> <button type="submit" class="nb">Home</button> </form> </li> <li> <form action="/message" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
        req.query.inuser +
        '"> </div> <button type="submit" class="nb">Message</button> </form> </li> <li> <form action="/approvals" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
        req.query.inuser +
        '"> </div> <button id="active" type="submit" class="nb">Approvals</button> </form> </li> <li id="logout"> <form action="/logout" method="get"> <button type="submit" class="nb">Log out</button> </form> </li> </ul>';
      var index = 0;
      indocs.forEach((indoc) => {
        if (indoc.data().AG == "1") {
          var A = "Attendance Granted";
          var ARes = "G";
        } else {
          var A = "Attendance Rejected";
          var ARes = "R";
        }
        if (indoc.data().OG == "1") {
          var O = "Outing Granted";
          var ORes = "G";
        } else {
          var O = "Outing Rejected";
          var ORes = "R";
        }
        temp =
          temp +
          '<br> <div style=" width: 1000px "> <input type="button" onclick="printDiv(' +
          index +
          ')" value="Print" style=" float:right ; background-color: #333 ; color : white ; "/> </div> <div id="' +
          index +
          '">  <center> <form>  <table > <tr> <td class="lab"><label>Register No:</label></td> <td><input type="text" value="' +
          indoc.data().regno +
          '" name="regno"></td> </tr> <tr> <td class="lab"><label>Year:</label></td> <td><input type="text" value="' +
          indoc.data().year +
          '" name="year"></td> </tr> <tr> <td class="lab"><label>Branch:</label></td> <td><input type="text" value="' +
          indoc.data().branch +
          '" name="branch"></td> </tr> <tr> <td class="lab"><label>Date From:</label></td> <td><input type="text" name="from" value="' +
          indoc.data().from +
          '"></td> </tr> <tr> <td class="lab"><label>Date To:</label></td> <td><input type="text" name="to" value="' +
          indoc.data().to +
          '"></td> </tr> <tr> <td class="lab"><label>Message:</label></td> <td> <textarea name="message" rows="15" cols="100">' +
          indoc.data().message +
          '</textarea> </td> </tr> <br> <tr> <td colspan="2"> <center> <button class="result ' +
          ARes +
          '"  type="button" >' +
          A +
          '</button> <button class="result ' +
          ORes +
          '" type="button" >' +
          O +
          "</button> </center> </td> </tr> </table> </form> </center> </div>";
        index = index + 1;
      });
      temp =
        temp +
        '</body><script type="text/javascript"> function printDiv(divName) { var printContents = document.getElementById(divName).innerHTML; w=window.open(); w.document.write(printContents); w.print(); w.close(); } </script> </html>';
      res.send(temp);
    });
});

app.post("/HODloginsubmit", (req, res) => {
  db.collection("HODLogin")
    .where("username", "==", req.body.inuser)
    .get()
    .then((docs) => {
      if (docs._size == 0) {
        res.sendFile(__dirname + "/logininvalid.html");
      } else {
        docs.forEach((doc) => {
          if (hash.verify(req.body.inpass, doc.data().password)) {
            res.send(
              '<!DOCTYPE html> <html> <head> <style> ul { list-style-type: none; margin: 0; padding: 0; overflow: hidden; background-color: #333; position: -webkit-sticky; position: sticky; top: 0; } li { float: left; } li .nb { border: none; background: none; text-decoration: none; display: block; color: white; text-align: center; padding: 14px 16px; } li .nb:hover { background-color: #111; } #active { background-color: #4CAF50; } .lab{ background-color: #4CAF50; color: white; border-radius: 4px; width: 80px; padding: 10px; } form{ font-size: 0.5cm; } table{ background-color: #333; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; } select { width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } select option { padding: 5px; font-size: 14px; background-color: #fff; color: #333; text-align: center; } select option:hover { background-color: #f0f0f0; } #sb{ width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } #sb:hover{ background-color: #4CAF50; color: white; border-color: white; } #hide{ display: none; } #logout{ float: right; } </style> </head> <body> <ul> <li> <form action="/HOD_class_info" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
                req.body.inuser +
                '"> </div> <button id="active" type="submit" class="nb">Home</button> </form> </li> <li> <form action="/permission_manager" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
                req.body.inuser +
                '"> </div> <button type="submit" class="nb">Permission Manager</button> </form> </li> <li> <form action="/inbox" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
                req.body.inuser +
                '"> </div> <button type="submit" class="nb">Inbox</button> </form> </li> <li id="logout"> <form action="/logout" method="get"> <button type="submit" class="nb">Log out</button> </form> </li> </ul> <br> <div> <center> <form action="/HOD_attendance_search" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
                req.body.inuser +
                '"> </div> <table> <tr> <td class="lab"><label>Year:</label></td> <td> <select name="year" required> <option>select</option> <option value="1">1-year</option> <option value="2">2-year</option> <option value="3">3-year</option> <option value="4">4-year</option> </select> </td> </tr> <tr> <td class="lab"><label>Branch:</label></td> <td> <select name="branch" required> <option>select</option> <option value="AIML">AIML</option> <option value="AIDS">AIDS</option> <option value="CSE">CSE</option> <option value="IT">IT</option> <option value="CSBS">CSBS</option> <option value="ECE">ECE</option> <option value="CE">CE</option> <option value="ME">ME</option> </select> </td> </tr> <br> <tr> <td colspan="2"> <center> <button id="sb" type="submit" >Get details</button> </center> </td> </tr> </table> </form> </center> </div> </body> </html> ',
            );
          } else {
            res.sendFile(__dirname + "/logininvalid.html");
          }
        });
      }
    });
});

app.get("/HOD_class_info", (req, res) => {
  res.send(
    '<!DOCTYPE html> <html> <head> <style> ul { list-style-type: none; margin: 0; padding: 0; overflow: hidden; background-color: #333; position: -webkit-sticky; position: sticky; top: 0; } li { float: left; } li .nb { border: none; background: none; text-decoration: none; display: block; color: white; text-align: center; padding: 14px 16px; } li .nb:hover { background-color: #111; } #active { background-color: #4CAF50; } .lab{ background-color: #4CAF50; color: white; border-radius: 4px; width: 80px; padding: 10px; } form{ font-size: 0.5cm; } table{ background-color: #333; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; } select { width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } select option { padding: 5px; font-size: 14px; background-color: #fff; color: #333; text-align: center; } select option:hover { background-color: #f0f0f0; } #sb{ width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } #sb:hover{ background-color: #4CAF50; color: white; border-color: white; } #hide{ display: none; } #logout{ float: right; } </style> </head> <body> <ul> <li> <form action="/HOD_class_info" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button id="active" type="submit" class="nb">Home</button> </form> </li> <li> <form action="/permission_manager" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button type="submit" class="nb">Permission Manager</button> </form> </li> <li> <form action="/inbox" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button type="submit" class="nb">Inbox</button> </form> </li> <li id="logout"> <form action="/logout" method="get"> <button type="submit" class="nb">Log out</button> </form> </li> </ul> <br> <div> <center> <form action="/HOD_attendance_search" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <table> <tr> <td class="lab"><label>Year:</label></td> <td> <select name="year" required> <option>select</option> <option value="1">1-year</option> <option value="2">2-year</option> <option value="3">3-year</option> <option value="4">4-year</option> </select> </td> </tr> <tr> <td class="lab"><label>Branch:</label></td> <td> <select name="branch" required> <option>select</option> <option value="AIML">AIML</option> <option value="AIDS">AIDS</option> <option value="CSE">CSE</option> <option value="IT">IT</option> <option value="CSBS">CSBS</option> <option value="ECE">ECE</option> <option value="CE">CE</option> <option value="ME">ME</option> </select> </td> </tr> <br> <tr> <td colspan="2"> <center> <button id="sb" type="submit" >Get details</button> </center> </td> </tr> </table> </form> </center> </div> </body> </html> ',
  );
});
app.get("/permission_manager", (req, res) => {
  res.send(
    '<!DOCTYPE html> <html> <head> <style> ul { list-style-type: none; margin: 0; padding: 0; overflow: hidden; background-color: #333; position: -webkit-sticky; position: sticky; top: 0; } li { float: left; } li .nb { border: none; background: none; text-decoration: none; display: block; color: white; text-align: center; padding: 14px 16px; } li .nb:hover { background-color: #111; } #active { background-color: #4CAF50; } .lab{ background-color: #4CAF50; color: white; border-radius: 4px; width: 120px; padding: 10px; } form{ font-size: 0.5cm; } table{ background-color: #333; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; } select { width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } input{ width: 130px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } select option { padding: 5px; font-size: 14px; background-color: #fff; color: #333; text-align: center; } select option:hover { background-color: #f0f0f0; } #sb{ width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } #sb:hover{ background-color: #4CAF50; color: white; border-color: white; } #hide{ display: none; } #logout{ float: right; } </style> </head> <body> <ul> <li> <form action="/HOD_class_info" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button type="submit" class="nb">Home</button> </form> </li> <li> <form action="/permission_manager" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button id="active" type="submit" class="nb">Permission Manager</button> </form> </li> <li> <form action="/inbox" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <button type="submit" class="nb">Inbox</button> </form> </li> <li id="logout"> <form action="/logout" method="get"> <button type="submit" class="nb">Log out</button> </form> </li> </ul> <br> <div> <center> <form action="/grant_permission" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
      req.query.inuser +
      '"> </div> <table> <tr> <td class="lab"><label>Year:</label></td> <td> <select name="year" required> <option>select</option> <option value="1">1-year</option> <option value="2">2-year</option> <option value="3">3-year</option> <option value="4">4-year</option> </select> </td> </tr> <tr> <td class="lab"><label>Branch:</label></td> <td> <select name="branch" required> <option>select</option> <option value="AIML">AIML</option> <option value="AIDS">AIDS</option> <option value="CSE">CSE</option> <option value="IT">IT</option> <option value="CSBS">CSBS</option> <option value="ECE">ECE</option> <option value="CE">CE</option> <option value="ME">ME</option> </select> </td> </tr> <tr> <td class="lab"><label>Register No:</label></td> <td> <input type="text" name="regno" required> </td> </tr> <tr> <td class="lab"><label>From:</label></td> <td> <input type="date" name="from" required> </td> </tr> <tr> <td class="lab"><label>To:</label></td> <td> <input type="date" name="to" required> </td> </tr> <tr> <td class="lab"><label>Grant Attendance:</label></td> <td> <select name="AG" required> <option value="2">select</option> <option value="1">Yes</option> <option value="2">No</option> </select> </td> </tr> <tr> <td class="lab"><label>Grant Outing:</label></td> <td> <select name="OG" required> <option value="2">select</option> <option value="1">Yes</option> <option value="2">No</option> </select> </td> </tr> <br> <tr> <td colspan="2"> <center> <button id="sb" type="submit" >Grant permission</button> </center> </td> </tr> </table> </form> </center> </div> </body> </html> ',
  );
});

app.get("/HOD_attendance_search", async (req, res) => {
  const classDocs = await db
    .collection("ClassData")
    .where("year", "==", req.query.year)
    .where("branch", "==", req.query.branch)
    .get();

  classDocs.forEach((doc) => {
    var temp = "";
    var j = "";
    for (var i = 0; i < doc.data().count; i++) {
      if (i % 5 == 0) {
        temp = temp + "</tr><tr>";
      }
      j = doc.data()[i];
      if (doc.data()[j] == 0 || doc.data()[j] == -1) {
        temp = temp + "<td>" + j + "</td>";
      } else if (doc.data()[j] == 1) {
        temp = temp + '<td class="G">' + j + "</td>";
      } else if (doc.data()[j] == 2) {
        temp = temp + '<td class="B">' + j + "</td>";
      } else if (doc.data()[j] == 3) {
        temp = temp + '<td class="Y">' + j + "</td>";
      }
    }

    res.send(
      '<!DOCTYPE html> <html> <head> <style> ul { list-style-type: none; margin: 0; padding: 0; overflow: hidden; background-color: #333; position: -webkit-sticky; position: sticky; top: 0; } li { float: left; } li .nb { border: none; background: none; text-decoration: none; display: block; color: white; text-align: center; padding: 14px 16px; } li .nb:hover { background-color: #111; } #active { background-color: #4CAF50; } #tab{ background-color: #333; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; font-size: 0.7cm; } td{ background-color: white; color: #333; border-radius: 4px; width: 80px; padding: 10px; } th{ background-color: #4CAF50; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; font-size: 0.7cm; color: white; } #signal{ float: right; } #GS{ width: 1cm; height: 1cm; background-color: #4CAF50; } #YS{ width: 1cm; height: 1cm; background-color: yellow; } #BS{ width: 1cm; height: 1cm; background-color: blue; } .G{ background-color: #4CAF50; } .B{ background-color: blue; } .Y{ background-color: yellow; } #hide{ display: none; } #logout{ float: right; } </style> </head> <body> <ul> <li> <form action="/HOD_class_info" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
        req.query.inuser +
        '"> </div> <button type="submit" class="nb">Home</button> </form> </li> <li> <form action="/permission_manager" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
        req.query.inuser +
        '"> </div> <button type="submit" class="nb">Permission Manager</button> </form> </li> <li> <form action="/inbox" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
        req.query.inuser +
        '"> </div> <button type="submit" class="nb">Inbox</button> </form> </li> <li id="logout"> <form action="/logout" method="get"> <button type="submit" class="nb">Log out</button> </form> </li> </ul> <div> <center> <table> <tr> <th>' +
        req.query.year +
        "-year/" +
        req.query.branch +
        '</th> </tr> </table> </center> <div id="signal"> <table> <tr> <td> <div id="GS"></div> </td> <td> Attendance Granted </td> </tr> <tr> <td> <div id="BS"></div> </td> <td> Outing Granted </td> </tr> <tr> <td> <div id="YS"></div> </td> <td> Attendance & Outing Granted </td> </tr> </table> </div> <center> <table id="tab"> <tr> ' +
        temp +
        " </tr> </table> </center> </div> </body> </html>",
    );
  });
});

app.get("/grant_permission", (req, res) => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const day = currentDate.getDate().toString().padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  if (req.query.AG == "1" && req.query.OG == "1") {
    var value = "3";
  } else if (req.query.AG == "2" && req.query.OG == "2") {
    var value = "-1";
  } else if (req.query.AG == "1") {
    var value = "1";
  } else {
    var value = "2";
  }

  var resvalue = "0";
  if (req.query.from <= formattedDate && req.query.to >= formattedDate) {
    db.collection("ClassData")
      .where("year", "==", req.query.year)
      .where("branch", "==", req.query.branch)
      .get()
      .then((docs) => {
        docs.forEach((doc) => {
          var currvalue = doc.data()[req.query.regno.toUpperCase()];

          if (currvalue == "0") {
            resvalue = value;
          } else if (currvalue == "3") {
            resvalue = "3";
          } else if (currvalue == "1") {
            if (value == "2" || value == "3") {
              resvalue = "3";
            }
          } else if (currvalue == "2") {
            if (value == "1" || value == "3") {
              resvalue = "3";
            }
          }

          doc.ref.update({
            [req.query.regno.toUpperCase()]: resvalue,
          });
        });
      });
  }

  db.collection("PermissionData")
    .add({
      year: req.query.year,
      branch: req.query.branch,
      regno: req.query.regno.toUpperCase(),
      from: req.query.from,
      to: req.query.to,
      Gval: value,
    })
    .then(() => {
      res.send(
        '<!DOCTYPE html> <html> <head> <style> ul { list-style-type: none; margin: 0; padding: 0; overflow: hidden; background-color: #333; position: -webkit-sticky; position: sticky; top: 0; } li { float: left; } li .nb { border: none; background: none; text-decoration: none; display: block; color: white; text-align: center; padding: 14px 16px; } li .nb:hover { background-color: #111; } #active { background-color: #4CAF50; } .lab{ background-color: #4CAF50; color: white; border-radius: 4px; width: 120px; padding: 10px; } form{ font-size: 0.5cm; } table{ background-color: #333; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; } .block{ background-color: #4CAF50; color: white; border-radius: 4px; width: 160px; padding: 10px; } select { width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } input{ width: 130px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } select option { padding: 5px; font-size: 14px; background-color: #fff; color: #333; text-align: center; } select option:hover { background-color: #f0f0f0; } #sb{ width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } #sb:hover{ background-color: #4CAF50; color: white; border-color: white; } #hide{ display: none; } #logout{ float: right; } </style> </head> <body> <ul> <li> <form action="/HOD_class_info" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
          req.query.inuser +
          '"> </div> <button type="submit" class="nb">Home</button> </form> </li> <li> <form action="/permission_manager" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
          req.query.inuser +
          '"> </div> <button id="active" type="submit" class="nb">Permission Manager</button> </form> </li> <li> <form action="/inbox" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
          req.query.inuser +
          '"> </div> <button type="submit" class="nb">Inbox</button> </form> </li> <li id="logout"> <form action="/logout" method="get"> <button type="submit" class="nb">Log out</button> </form> </li> </ul> <br> <div> <center> <form action="/grant_permission" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
          req.query.inuser +
          '"> </div> <table> <tr> <td colspan="2"> <center> <p class="block">Sucessfully Granted</p> </center> </td> </tr> <tr> <td class="lab"><label>Year:</label></td> <td> <select name="year" required> <option>select</option> <option value="1">1-year</option> <option value="2">2-year</option> <option value="3">3-year</option> <option value="4">4-year</option> </select> </td> </tr> <tr> <td class="lab"><label>Branch:</label></td> <td> <select name="branch" required> <option>select</option> <option value="AIML">AIML</option> <option value="AIDS">AIDS</option> <option value="CSE">CSE</option> <option value="IT">IT</option> <option value="CSBS">CSBS</option> <option value="ECE">ECE</option> <option value="CE">CE</option> <option value="ME">ME</option> </select> </td> </tr> <tr> <td class="lab"><label>Register No:</label></td> <td> <input type="text" name="regno" required> </td> </tr> <tr> <td class="lab"><label>From:</label></td> <td> <input type="date" name="from" required> </td> </tr> <tr> <td class="lab"><label>To:</label></td> <td> <input type="date" name="to" required> </td> </tr> <tr> <td class="lab"><label>Grant Attendance:</label></td> <td> <select name="AG" required> <option value="2">select</option> <option value="1">Yes</option> <option value="2">No</option> </select> </td> </tr> <tr> <td class="lab"><label>Grant Outing:</label></td> <td> <select name="OG" required> <option value="2">select</option> <option value="1">Yes</option> <option value="2">No</option> </select> </td> </tr> <br> <tr> <td colspan="2"> <center> <button id="sb" type="submit" >Grant permission</button> </center> </td> </tr> </table> </form> </center> </div> <script> </script> </body> </html> ',
      );
    });
});

app.get("/inbox", async (req, res) => {
  db.collection(req.query.inuser)
    .where("AG", "==", "0")
    .where("OG", "==", "0")
    .get()
    .then((docs) => {
      var temp =
        '<!DOCTYPE html> <html> <head> <style> ul { list-style-type: none; margin: 0; padding: 0; overflow: hidden; background-color: #333; position: -webkit-sticky; position: sticky; top: 0; } li { float: left; } li .nb { border: none; background: none; text-decoration: none; display: block; color: white; text-align: center; padding: 14px 16px; } li .nb:hover { background-color: #111; } #active { background-color: #4CAF50; } .lab{ background-color: #4CAF50; color: white; border-radius: 4px; width: 80px; padding: 10px; } form{ font-size: 0.5cm; } table{ background-color: #333; padding: 0.7cm; border-spacing: 0.25cm; border-radius: 0.5cm; } select { width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } select option { padding: 5px; font-size: 14px; background-color: #fff; color: #333; text-align: center; } select option:hover { background-color: #f0f0f0; } input{ width: 130px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } #sb{ width: 150px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; background-color: #fff; color: #333; appearance: none; outline: none; cursor: pointer; } #sb:hover{ background-color: #4CAF50; color: white; border-color: white; } #hide{ display: none; } #logout{ float: right; } </style> </head> <body> <ul> <li> <form action="/HOD_class_info" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
        req.query.inuser +
        '"> </div> <button type="submit" class="nb">Home</button> </form> </li> <li> <form action="/permission_manager" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
        req.query.inuser +
        '"> </div> <button type="submit" class="nb">Permission Manager</button> </form> </li> <li> <form action="/inbox" method="get"> <div id="hide"> <input type="text" name="inuser" value="' +
        req.query.inuser +
        '"> </div> <button id="active" type="submit" class="nb">Inbox</button> </form> </li> <li id="logout"> <form action="/logout" method="get"> <button type="submit" class="nb">Log out</button> </form> </li> </ul>';
      docs.forEach((doc) => {
        temp =
          temp +
          '<br> <div> <center> <form action="/verified_message" method="get"> <div> <input id="hide" type="text" name="inuser" value="' +
          req.query.inuser +
          '"> </div> <table> <tr> <td class="lab"><label>Register No:</label></td> <td><input type="text" value="' +
          doc.data().regno +
          '" name="regno"></td> </tr> <tr> <td class="lab"><label>Year:</label></td> <td><input type="text" value="' +
          doc.data().year +
          '" name="year"></td> </tr> <tr> <td class="lab"><label>Branch:</label></td> <td><input type="text" value="' +
          doc.data().branch +
          '" name="branch"></td> </tr> <tr> <td class="lab"><label>Date From:</label></td> <td><input type="text" name="from" value="' +
          doc.data().from +
          '"></td> </tr> <tr> <td class="lab"><label>Date To:</label></td> <td><input type="text" name="to" value="' +
          doc.data().to +
          '"></td> </tr> <tr> <td class="lab"><label>Message:</label></td> <td> <textarea name="message" rows="15" cols="100">' +
          doc.data().message +
          '</textarea> </td> </tr> <tr> <td class="lab"><label>Grant Attendance:</label></td> <td> <select name="AG"> <option value="2">select</option> <option value="1">Yes</option> <option value="2">No</option> </select> </td> </tr> <tr> <td class="lab"><label>Grant Outing:</label></td> <td> <select name="OG"> <option value="2">select</option> <option value="1">Yes</option> <option value="2">No</option> </select> </td> </tr> <br> <tr> <td colspan="2"> <center> <button id="sb" type="submit" >Grant</button> </center> </td> </tr> </table> </form> </center> </div>';
      });
      temp = temp + "</body> </html>";
      res.send(temp);
    });
});

app.get("/verified_message", (req, res) => {
  db.collection(req.query.inuser)
    .where("regno", "==", req.query.regno)
    .where("from", "==", req.query.from)
    .where("to", "==", req.query.to)
    .where("message", "==", req.query.message)
    .get()
    .then((docs) => {
      docs.forEach((doc) => {
        doc.ref.update({
          AG: req.query.AG,
          OG: req.query.OG,
        });
      });
    });

  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const day = currentDate.getDate().toString().padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  if (req.query.AG == "1" && req.query.OG == "1") {
    var value = "3";
  } else if (req.query.AG == "2" && req.query.OG == "2") {
    var value = "-1";
  } else if (req.query.AG == "1") {
    var value = "1";
  } else {
    var value = "2";
  }

  var resvalue = "0";
  if (req.query.from <= formattedDate && req.query.to >= formattedDate) {
    db.collection("ClassData")
      .where("year", "==", req.query.year)
      .where("branch", "==", req.query.branch)
      .get()
      .then((docs) => {
        docs.forEach((doc) => {
          var currvalue = doc.data()[req.query.regno];

          if (currvalue == "0") {
            resvalue = value;
          } else if (currvalue == "3") {
            resvalue = "3";
          } else if (currvalue == "1") {
            if (value == "2" || value == "3") {
              resvalue = "3";
            }
          } else if (currvalue == "2") {
            if (value == "1" || value == "3") {
              resvalue = "3";
            }
          }
          doc.ref.update({
            [req.query.regno]: resvalue,
          });
        });
      });
  }
  db.collection("PermissionData").add({
    year: req.query.year,
    branch: req.query.branch,
    regno: req.query.regno,
    from: req.query.from,
    to: req.query.to,
    Gval: value,
  });
  setTimeout(() => {
    res.redirect("/inbox?inuser=" + req.query.inuser);
  }, 3000);
});

app.listen(4000);

import csv  
import re  
import os  
  
def clean_phone_number(phone):  
    """  
    Cleans the phone number by removing any non-digit characters and ensures it is 10 digits long.  
  
    Args:  
        phone (str): The phone number as a string.  
  
    Returns:  
        str: The cleaned phone number containing exactly 10 digits.  
    """  
    phone = re.sub(r'\D', '', phone)  
    if len(phone) == 10:  
        return phone  
    elif len(phone) < 10:  
        # Pad with leading zeros  
        return phone.zfill(10)  
    else:  
        # Truncate to the last 10 digits  
        return phone[-10:]  
  
def csv_to_vcard(csv_file, vcard_file):  
    """  
    Converts a CSV file containing contact information to a vCard file.  
  
    Args:  
        csv_file (str): The path to the CSV file.  
        vcard_file (str): The path to the output vCard file.  
  
    Raises:  
        FileNotFoundError: If the CSV file is not found.  
        Exception: For any other errors encountered during processing.  
    """  
    try:  
        with open(csv_file, 'r', encoding='utf-8') as f:  
            reader = csv.DictReader(f)  
            with open(vcard_file, 'w', encoding='utf-8') as vcf:  
                for row in reader:  
                    # Extract fields from the CSV  
                    first_name = row["First Name"].strip() if row.get("First Name") else ""  
                    last_name = row["Last Name"].strip() if row.get("Last Name") else ""  
                    phone_number = clean_phone_number(row["Phone #"]) if row.get("Phone #") else ""  
                    email = row["Email"].strip() if row.get("Email") else ""  
                    quarter = row["QTR"].strip() if row.get("QTR") else ""  
                    role = row["Role"].strip() if row.get("Role") else ""  
                    coach = row["Coach"].strip() if row.get("Coach") else ""  
                    colleague = row["Committed Colleague "].strip() if row.get("Committed Colleague ") else ""  
                    accountability = row["Accountability / Responsibility"].strip() if row.get("Accountability / Responsibility") else ""  
                    t1_t2 = row["T1/T2"].strip() if row.get("T1/T2") else ""  
  
                    # Skip entry if essential information is missing  
                    if not (first_name and last_name and phone_number and email):  
                        continue  
  
                    # Start vCard entry  
                    vcf.write('BEGIN:VCARD\n')  
                    vcf.write('VERSION:3.0\n')  
                    vcf.write(f'FN:{first_name} {last_name}\n')  
                    vcf.write(f'N:{last_name};{first_name};;;\n')  
                    vcf.write(f'TEL;TYPE=CELL:{phone_number}\n')  
                    vcf.write(f'EMAIL;TYPE=HOME:{email}\n')  
  
                    # Add additional information in the NOTES field  
                    notes = []  
                    if t1_t2:  
                        notes.append(f"T1/T2: {t1_t2}")  
                    if quarter:  
                        notes.append(f"Quarter: {quarter}")  
                    if role:  
                        notes.append(f"Role: {role}")  
                    if coach:  
                        notes.append(f"Coach: {coach}")  
                    if colleague:  
                        notes.append(f"Colleague: {colleague}")  
                    if accountability:  
                        notes.append(f"Accountability: {accountability}")  
                    if notes:  
                        vcf.write(f'NOTE:{"; ".join(notes)}\n')  
  
                    # End vCard entry  
                    vcf.write('END:VCARD\n')  
        print(f'vCard file created successfully at {vcard_file}')  
    except FileNotFoundError:  
        print(f"CSV file not found: {csv_file}")  
    except Exception as e:  
        print(f"An error occurred: {e}")  
  
def main():  
    """  
    Main function to execute the CSV to vCard conversion.  
  
    Assumes that the CSV file is located in the same directory as the script.  
    """  
    # Get the directory of the current script  
    script_dir = os.path.dirname(os.path.abspath(__file__))  
  
    # List all files in the directory to debug the file existence issue  
    files_in_directory = os.listdir(script_dir)  
    print("Files in the current directory:", files_in_directory)  
  
    # Specify the path to your CSV file and the output vCard file  
    csv_file_path = os.path.join(script_dir, 'roster.csv')  
    vcard_file_path = os.path.join(script_dir, 'output_contacts.vcf')  
  
    # Print the current working directory  
    print("Current working directory:", script_dir)  
  
    # Convert the CSV to vCard  
    csv_to_vcard(csv_file_path, vcard_file_path)  
  
if __name__ == "__main__":  
    main()  
